import express, { type Request } from 'express';
import got, { HTTPError } from 'got';
import { s } from '@sapphire/shapeshift';
import { Sequelize } from 'sequelize';
import * as config from './config';
import { User } from './models/User';
import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';
import { Pronoun } from './models/Pronoun';
import { promises as fs } from 'fs'
import path from 'path'
import { Op } from 'sequelize';
import bodyParser from 'body-parser';

interface PronounType {
    id: string;
    pronoundb: string;
    pronoun: string;
    singular: string;
    ownership: string;
    description: string;
    subpronouns?: string[];
}

const app = express();
app.use(bodyParser.json())
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
        ...config.database,
        logging: false
    })
    await sequelize.authenticate()
    Pronoun.initModel(sequelize)
    User.initModel(sequelize)
    await sequelize.sync({alter: true})
    const defaultPronounFiles = await fs.readdir(path.join(__dirname, 'pronouns'))
    const defaultPronouns = await Promise.all(
        defaultPronounFiles.map(f => import(
            path.join(__dirname, 'pronouns', f)
        ).then(i => i.default) as Promise<PronounType>)
    )
    const defaultPronounsDB = await Pronoun.findAll({
        where: {
            id: {
                [Op.any]: defaultPronouns.map(p => p.id)
            }
        }
    })
    // I am bad at naming vars
    let defaultPronounsWithoutDBEntry: PronounType[] = [];
    for (const pronoun of defaultPronouns) {
        if (!defaultPronounsDB.find(dbp => dbp.id === pronoun.id)) {
            defaultPronounsWithoutDBEntry.push(pronoun)
        }
    }
    await Pronoun.bulkCreate(defaultPronounsWithoutDBEntry.map(p => ({
        ...p,
        creatorId: null
    })))
    
    // * First callback, checks in database, if not found, then moves onto pronoundb fallback.
    app.get('/api/v1/lookup', async (req, res, next) => {
        try {
            s.object({
                platform: s.enum(
                    'discord',
                    'facebook',
                    'github',
                    'twitch',
                    'twitter'
                ),
                id: s.string
            }).parse(req.query);
        } catch {
            res.status(422).send({
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
        const pronoun = (await Pronoun.findByPk(userModel.preferredPronoun))!
        const pronounData = {
            id: pronoun.id,
            pronoundb: pronoun.pronoundb,
            pronoun: pronoun.pronoun,
            singular: pronoun.singular,
            description: pronoun.description,
            ownership: pronoun.ownership,
            subpronouns: pronoun.subpronouns
        }
        if (pronounData.subpronouns.length >= 2 && userModel.randomizedSubpronouns) {
            const randomizedPronoun = (await Pronoun.findByPk(pronoun.subpronouns[Math.floor(Math.random()*pronoun.subpronouns.length)]))!;
            pronounData.pronoun = `${randomizedPronoun.pronoun} (${pronoun.pronoun})`   
            pronounData.singular = randomizedPronoun.singular
            pronounData.description = randomizedPronoun.description
            pronounData.ownership = randomizedPronoun.ownership
        }
        const extraPronouns = await Pronoun.findAll({
            where: {
                id: {
                    [Op.or]: userModel.extraPronouns
                }
            }
        })
        const extraPronounData = extraPronouns.map(p => ({
            id: p.id,
            pronoundb: p.pronoundb,
            pronoun: p.pronoun,
            singular: p.singular,
            description: p.description,
            ownership: p.ownership,
            subpronouns: p.subpronouns
        }))
        for (const [i, extraPronoun] of extraPronounData.entries()) {
            if (extraPronoun.subpronouns.length >= 2 && userModel.randomizedSubpronouns) {
                const randomizedPronoun = (await Pronoun.findByPk(extraPronoun.subpronouns[Math.floor(Math.random()*pronoun.subpronouns.length)]))!;
                extraPronounData[i].pronoun = `${randomizedPronoun.pronoun} (${extraPronoun.pronoun})`   
                extraPronounData[i].singular = randomizedPronoun.singular
                extraPronounData[i].description = randomizedPronoun.description
                extraPronounData[i].ownership = randomizedPronoun.ownership
            }
        }
        
        res.send({
            userId: req.query.id,
            platform: req.query.platform,
            preferredPronoun: pronounData,
            extraPronouns: extraPronounData,
            pronoundbCompat: false
        })
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
        const pronounDetails = defaultPronouns.find(p => p.pronoundb === pronoundbResponse.pronouns)!
        res.send({
            userId: req.query.id,
            platform: req.query.platform,
            preferredPronoun: pronounDetails,
            extraPronouns: [],
            pronoundbCompat: true
        })
    })

    // * Register endpoint for verifying login
    app.get('/api/v1/callback', async (req, res) => {
        try {
            s.string.parse(req.query.code)
        } catch {
            res.status(422).send({
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
                res.status(500).send({
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
                res.status(500).send({
                    error: 503,
                    message: 'Discord returned a non 2xx status code, was the provided code valid?'
                })
                console.log(e.response.body)
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

    app.post('/api/v1/pronoun', async (req, res) => {
        try {
            s.string.parse(req.headers.authorization)
            s.object({
                pronoun: s.string,
                singular: s.string,
                description: s.string,
                ownership: s.string,
            }).parse(req.body)
        } catch {
            res.status(422).send({
                error: 502,
                message: 'Authorization or all pronoun data was not provided'
            })
            return
        }
        const token = req.headers.authorization 
        if (!token) {
            res.status(401).send({
                error: 401,
                message: 'You must provide a token'
            })
            return
        }
        const verifiedJwt = await jwtVerify(token, HMACToken, {
            issuer: 'pronoundb-custom'
        }).catch(e => null)
        if (!verifiedJwt) {
            res.status(401).send({
                error: 401,
                message: 'Invalid token'
            })
            return
        }
        const user = await User.findOne({
            where: {
                discord: verifiedJwt.payload.sub
            }
        })
        if (!user) {
            res.status(500).send({
                error: 500,
                message: 'Wtf'
            })
            return
        }
        const pronoun = await Pronoun.create({
            creatorId: user.id,
            pronoun: req.body.pronoun,
            singular: req.body.singular,
            description: req.body.description,
            ownership: req.body.ownership
        })
        res.send({
            id: pronoun.id,
            creatorId: pronoun.creatorId,
            pronoun: pronoun.pronoun,
            singular: pronoun.singular,
            description: pronoun.description,
            ownership: pronoun.ownership,
            pronoundb: pronoun.pronoundb
        })
    })

    app.delete('/api/v1/pronoun', async (req, res) => {
        try {
            s.object({
                id: s.string
            }).parse(req.query)
        } catch {
            res.status(422).send({
                error: 502,
                message: 'Pronoun ID was not provided'
            })
            return
        }
        const token = req.headers.authorization 
        if (!token) {
            res.status(401).send({
                error: 401,
                message: 'You must provide a token'
            })
            return
        }
        const verifiedJwt = await jwtVerify(token, HMACToken, {
            issuer: 'pronoundb-custom'
        }).catch(e => null)
        if (!verifiedJwt) {
            res.status(401).send({
                error: 401,
                message: 'Invalid token'
            })
            return
        }
        const pronoun = await Pronoun.findByPk(req.query.id as string)
        if (!pronoun) {
            res.status(422).send({
                error: 422,
                message: 'Invalid pronoun ID'
            })
            return
        }
        const user = await User.findOne({
            where: {
                discord: verifiedJwt.payload.sub
            }
        })
        if (!user) {
            res.status(500).send({
                error: 500,
                message: 'Wtf'
            })
            return
        }
        if (pronoun.creatorId !== user.id) {
            res.status(401).send({
                error: 401,
                message: 'You cannot delete this pronoun, as you did not create it.'
            })
            return
        }
        const usersUsingPronoun = await User.count({
            where: {
                preferredPronoun: pronoun.id
            }
        })
        if (usersUsingPronoun >= 1) {
            res.status(422).send({
                error: 506,
                message: 'You cannot delete this pronoun, as someone is currently using it.'
            })
            return
        }
        await pronoun.destroy();
        res.status(200).send();
    })

    app.patch('/api/v1/user', async (req, res) => {
        try {
            s.string.parse(req.headers.authorization)
            s.object({
                preferredPronounId: s.string,
                extraPronounIds: s.array(s.string),
                randomizedAny: s.boolean
            }).partial.parse(req.body)
        } catch {
            res.status(422).send({
                error: 502,
                message: 'Authorization or valid user data was not provided'
            })
            return
        }
        const token = req.headers.authorization 
        if (!token) {
            res.status(401).send({
                error: 401,
                message: 'You must provide a token'
            })
            return
        }
        const verifiedJwt = await jwtVerify(token, HMACToken, {
            issuer: 'pronoundb-custom'
        }).catch(e => null)
        if (!verifiedJwt) {
            res.status(401).send({
                error: 401,
                message: 'Invalid token'
            })
            return
        }
        const [userModel] = await User.findOrBuild({
            where: {
                discord: verifiedJwt.payload.sub
            },
            defaults: {
                discord: verifiedJwt.payload.sub
            }
        })
        if (req.body.preferredPronounId) {
            const pronoun = await Pronoun.findByPk(req.body.preferredPronounId)
            if (!pronoun) {
                res.status(422).send({
                    error: 504,
                    message: 'Invalid pronoun ID'
                })
                return
            }
            userModel.preferredPronoun = pronoun.id
        }
        if (req.body.extraPronounIds) {
            const {rows: pronouns, count} = await Pronoun.findAndCountAll({
                where: {
                    id: {
                        [Op.or]: req.body.extraPronounIds
                    }
                }
            })
            if (count < req.body.extraPronounIds.length) {
                res.status(422).send({
                    error: 507,
                    message: 'Could not find all extra pronouns in database, are they all valid?'
                })
                return
            }
            userModel.extraPronouns = pronouns.map(p => p.id)
        }
        if (req.body.randomizedSubpronouns) {
            userModel.randomizedSubpronouns = req.body.randomizedSubpronouns
        }
        await userModel.save()
        res.status(200).send()
    })

    app.listen(3000, () => console.log("Server started on port 3000!"))
})()
