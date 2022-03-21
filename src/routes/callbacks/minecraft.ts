import { Route, RouteOptions } from "@tyman/modulo";
import { Request, Response } from "express";
import { s } from '@sapphire/shapeshift';
import got from "got";
import { SignJWT } from "jose";
import { HMACToken } from "../../index";

type McOauthResponse = {
    status: 'success';
    message: string;
    uuid: string;
    username: string;
} | {
    status: 'fail';
    message: string;
}

@RouteOptions({
    path: "/api/v1/callback/minecraft",
    spec: {
        description: 'The oauth callback for minecraft (uses https://mc-oauth.net)',
        get: {
            description: 'Validates an mc-oauth token and return a JWT proof token',
            parameters: [{
                in: 'query',
                name: 'code',
                description: 'The mc-oauth token',
                required: true,
                schema: {
                    type: 'string'
                }
            }],
            responses: {
                '200': {
                    description: 'A successful oauth flow with mc-oauth',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                description: 'The successful oauth flow response',
                                properties: {
                                    token: {
                                        type: 'string',
                                        description: 'The JWT proof token signed by the server'
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
                    description: 'An unsuccessful oauth flow with mc-oauth',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                description: 'The unsuccessful oauth flow response',
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
            tags: ["Oauth"]
        }
    }
})
export default class MinecraftCallbackRoute extends Route {
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
        const response = await got.get('https://mc-oauth.net/api/api?token', {
            headers: {
                token: req.query.code as string
            }
        }).json<McOauthResponse>()
        if (response.status === 'fail') {
            res.status(500).send({
                error: 5,
                message: 'Mc-oauth returned an error, is the code valid?'
            })
            return
        }
        const jwt = await new SignJWT({
            sub: response.uuid,
            type: 'proof',
            platform: 'minecraft',
            username: response.username
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
    }
}