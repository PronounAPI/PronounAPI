import express, { type Request } from 'express';
import got, { HTTPError } from 'got';
import { pronounMap } from './constants';
import { s } from '@sapphire/shapeshift';
import { Sequelize } from 'sequelize';
import * as config from './config';
import { User } from './models/User';
import { SignJWT } from 'jose';
import { randomBytes } from 'crypto';

const app = express();
const HMACToken = randomBytes(512);

interface PronounDBResponse {
    pronouns: string
}

interface CodeGrantResponse {
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh_token: string,
    scope: string
}

interface UserResponse {
    id: string,
    username: string,
    avatar: string,
    discriminator: string,
    public_flags: number,
    flags: number,
    banner: string|null,
    banner_color: number|null,
    accent_color: number|null,
    locale: string,
    mfa_enabled: boolean
}

(async () => {
    const sequelize = new Sequelize({
        dialect: 'postgres',
        ...config.database
    })
    await sequelize.authenticate()
    User.initModel(sequelize)
    await sequelize.sync({alter: true})
    
    // * First callback, checks in database, if not found, then moves onto pronoundb fallback.
    app.get('/api/v1/lookup', async (req, res, next) => {
        try {
            s.object({
                platform: s.union(
                    s.literal('discord'),
                    s.literal('facebook'),
                    s.literal('github'),
                    s.literal('twitch'),
                    s.literal('twitter')
                ),
                id: s.string
            }).parse(req.query);
        } catch {
            res.send({
                error: 500,
                message: 'Please provide both a valid platform and id in url.'
            });
            return;
        }
        if (req.query.platform !== 'discord') return next();
        const userModel = await User.findOne({
            where: {
                discord: req.query.id as string
            }
        });
        if (!userModel) return next();

    })

    // * Second passthrough, uses pronoundb as a fallback, only fires if user is not found in database and pronouns returned in the first callback
    app.get('/api/v1/lookup', async (req, res) => {
        let pronoundbResponse: PronounDBResponse
        try {
            pronoundbResponse = await got.get(`https://pronoundb.org/api/v1/lookup`, {
                searchParams: {
                    platform: req.query.platform as string,
                    id: req.query.id as string
                }
            }).json<PronounDBResponse>()
        } catch (e) {
            if (e instanceof HTTPError) {
                res.status(e.response.statusCode).send(JSON.parse(e.response.body as string))
                return
            }
            throw e
        }
        const [pronounId, pronounDetails] = Object.entries(pronounMap).find(p => p[1].pronoundb === pronoundbResponse.pronouns)!
        res.send({
            userId: req.query.id,
            platform: req.query.platform,
            preferredPronoun: {
                id: pronounId,
                ...pronounDetails
            }
        })
    })

    // * Register endpoint for verifying login
    app.get('/api/v1/callback', async (req, res) => {
        try {
            s.string.parse(req.query.code)
        } catch {
            res.send({
                error: 502,
                message: 'Code was not provided, was this url redirected from discord?'
            })
            return
        }
        let codeGrantResponse: CodeGrantResponse
        try {
            const params = new URLSearchParams()
            params.append('client_id', config.discord.id)
            params.append('client_secret', config.discord.secret)
            params.append('grant_type', 'authorization_code')
            params.append('code', req.query.code as string)
            params.append('redirect_uri', config.discord.redirectUri)
            codeGrantResponse = await got.post('https://discord.com/api/v8/oauth2/token', {
                body: params.toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).json<CodeGrantResponse>()
        } catch (e) {
            if (e instanceof HTTPError) {
                res.send({
                    error: 503,
                    message: 'Discord returned a non 2xx status code, was the provided code valid?'
                })
                return
            }
            throw e
        }
        let userResponse: UserResponse
        try {
            userResponse = await got.get('https://discord.com/api/v8/users/@me', {
                headers: {
                    Authorization: `${codeGrantResponse.token_type} ${codeGrantResponse.access_token}`
                }
            }).json<UserResponse>()
        } catch (e) {
            if (e instanceof HTTPError) {
                res.send({
                    error: 503,
                    message: 'Discord returned a non 2xx status code, was the provided code valid?'
                })
                return
            }
            throw e
        }
        const jwt = await new SignJWT({
            sub: userResponse.id,
            tag: `${userResponse.username}#${userResponse.discriminator}`
        })
            .setProtectedHeader({
                typ: 'JWT',
                alg: 'HS512'
            })
            .setIssuer('pronoundb-custom')
            .setIssuedAt()
            .setExpirationTime('2h')
            .sign(HMACToken)
        res.send({
            token: jwt
        })
    })

    app.listen(3000)
})()