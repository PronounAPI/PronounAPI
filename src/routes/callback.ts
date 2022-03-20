import { Route, RouteOptions } from '@tyman/modulo';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import got, { HTTPError } from 'got';
import * as config from '../config';
import { s } from '@sapphire/shapeshift';
import { SignJWT } from 'jose';

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

@RouteOptions({
    path: '/api/v1/callback',
    spec: {
        get: {
            description: 'The callback endpoint for discord oauth',
            parameters: [{
                in: 'path',
                name: 'code',
                description: 'The discord authorization grant code',
                required: true,
                schema: {
                    type: 'string'
                }
            }],
            responses: {
                '200': {
                    description: 'A successful oauth2 flow with discord',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                description: 'The successful oauth2 flow response',
                                properties: {
                                    token: {
                                        type: 'string',
                                        description: 'The JWT token signed by the server'
                                    }
                                }
                            }
                        }
                    }
                },
                '422': {
                    $ref: "#/components/schemas/BadRequest"
                },
                '500': {
                    description: 'An unsuccessful oauth2 flow with discord',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                description: 'The unsuccessful oauth2 flow response',
                                properties: {
                                    error: {
                                        type: 'number',
                                        description: 'The error code'
                                    },
                                    message: {
                                        type: 'string',
                                        description: 'The error message'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
})
export default class CallbackRoute extends Route {
    public static HMACToken = randomBytes(512);
    
    async get(req: Request, res: Response) {
        try {
            s.string.parse(req.query.code)
        } catch {
            res.status(422).send({
                error: 1,
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
                    error: 2,
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
                    error: 2,
                    message: 'Discord returned a non 2xx status code, was the provided code valid?'
                })
                return
            }
            throw e
        }
        const jwt = await new SignJWT({
            sub: userResponse.id,
            platform: 'discord',
            tag: `${userResponse.username}#${userResponse.discriminator}`
        })
            .setProtectedHeader({
                typ: 'JWT',
                alg: 'HS512'
            })
            .setIssuer('pronoundb-custom')
            .setIssuedAt()
            .setExpirationTime('2h')
            .sign(CallbackRoute.HMACToken)
        res.send({
            token: jwt
        })
    }
}