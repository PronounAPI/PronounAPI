import { Middleware, Route, RouteOptions } from "@tyman/modulo";
import { Request, Response } from "express";
import { jwtVerify, SignJWT } from "jose";
import { Op } from "sequelize";
import { Pronoun } from "../../models/Pronoun";
import { User } from "../../models/User";
import { HMACToken, SupportedPlatforms } from "../../index";

@RouteOptions({
    path: '/api/v1/users/login',
    middleware: [Middleware.Json],
    spec: {
        post: {
            description: 'Creates a user based on a JWT token returned by an oauth callback if needed, and returns a JWT token for this user.',
            security: [{
                Proof: []
            }],
            responses: {
                '200': {
                    description: 'The user was successfully logged in',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                description: 'The successful login response',
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
                '401': {
                    description: 'An invalid or missing authorization token was provided',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Unauthorized'
                            }
                        }
                    }
                }
            }
        }
    }
})
export default class UsersLoginRoute extends Route {
    async post(req: Request, res: Response) {
        const token = req.headers.authorization
        if (!token) {
            res.status(401).send({
                error: 3,
                message: 'You must provide a token'
            })
            return
        }
        const verifiedJwt = await jwtVerify(token.replace('Bearer ', ''), HMACToken, {
            issuer: 'pronoundb-custom'
        }).catch(e => null)
        if (!verifiedJwt || verifiedJwt.payload.type !== 'proof') {
            res.status(401).send({
                error: 3,
                message: 'Invalid token'
            })
            return
        }
        const [user] = await User.findOrCreate({
            where: {
                [verifiedJwt.payload.platform as SupportedPlatforms]: verifiedJwt.payload.sub
            },
            defaults: {
                [verifiedJwt.payload.platform as SupportedPlatforms]: verifiedJwt.payload.sub
            }
        })
        const jwt = await new SignJWT({
            sub: String(user.id),
            type: 'user'
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