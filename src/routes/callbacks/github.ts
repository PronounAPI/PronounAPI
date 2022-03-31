import { Route, RouteOptions } from '@tyman/modulo';
import { Request, Response } from 'express';
import got, { HTTPError } from 'got';
import * as config from '../../config';
import { s } from '@sapphire/shapeshift';
import { SignJWT } from 'jose';
import { HMACToken } from '../../index';

interface AccessTokenResponse {
    access_token: string;
    scope: string;
    token_type: string;
}

interface UserResponse  {
    login: string;
    id: number;
}

@RouteOptions({
    path: '/api/v1/callback/github',
    spec: {
        get: {
            description: 'The callback endpoint for github oauth',
            parameters: [{
                in: 'path',
                name: 'code',
                description: 'The github authorization code',
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
                    description: 'An unsuccessful oauth2 flow with github',
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
            },
            tags: ['Oauth']
        }
    }
})
export default class GithubCallbackRoute extends Route {    
    async get(req: Request, res: Response) {
        try {
            s.string.parse(req.query.code)
        } catch {
            res.status(422).send({
                error: 1,
                message: 'Code was not provided'
            })
            return
        }
        let accessTokenResponse: AccessTokenResponse
        try {
            const params = new URLSearchParams()
            params.append('client_id', config.github.id)
            params.append('client_secret', config.github.secret)
            params.append('code', req.query.code as string)
            params.append('redirect_uri', config.github.redirectUri)
            accessTokenResponse = await got.post('https://github.com/login/oauth/access_token', {
                headers: {
                    'Accept': 'application/json'
                },
                searchParams: params
            }).json<AccessTokenResponse>()
        } catch (e) {
            if (e instanceof HTTPError) {
                res.status(500).send({
                    error: 2,
                    message: 'Github returned a non 2xx status code, was the provided code valid?'
                })
                return
            }
            throw e
        }
        let userResponse: UserResponse
        try {
            userResponse = await got.get('https://api.github.com/user', {
                headers: {
                    Authorization: `token ${accessTokenResponse.access_token}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            }).json<UserResponse>()
        } catch (e) {
            if (e instanceof HTTPError) {
                res.status(500).send({
                    error: 2,
                    message: 'Github returned a non 2xx status code, was the provided code valid?'
                })
                return
            }
            throw e
        }
        const jwt = await new SignJWT({
            sub: userResponse.id.toString(),
            type: 'proof',
            platform: 'github',
            username: `${userResponse.login}`
        })
            .setProtectedHeader({
                typ: 'JWT',
                alg: 'HS512'
            })
            .setIssuer('pronounapi')
            .setIssuedAt()
            .setExpirationTime('2h')
            .sign(HMACToken)
        res.send({
            token: jwt
        })
    }
}