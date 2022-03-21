import { Middleware, Route, RouteOptions } from "@tyman/modulo";
import { Request, Response } from "express";
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { s } from '@sapphire/shapeshift';
import { jwtVerify } from "jose";
import { User } from "../models/User";
import { Pronoun } from "../models/Pronoun";
import { HMACToken } from '../index';

@RouteOptions({
    path: '/api/v1/pronouns',
    middleware: [Middleware.Json],
    spec: {
        post: {
            description: 'Create a pronoun',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Pronoun'
                        }
                    }
                }
            },
            security: [{
                User: []
            }],
            responses: {
                '200': {
                    description: 'A successfully created pronoun response',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Pronoun'
                            }
                        }
                    }
                },
                '422': {
                    description: 'An invalid request was provided',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/BadRequest'
                            }
                        }
                    }
                },
                '401': {
                    description: 'An invalid authorization token was provided',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Unauthorized'
                            }
                        }
                    }
                },
                '429': {
                    description: 'Too many requests',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                description: 'Too many requests',
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
            tags: ['Pronouns']
        },
        delete: {
            description: 'Deletes an existing pronoun, can only be done by the person who created it',
            parameters: [{
                in: 'path',
                name: 'id',
                description: 'The ID of the pronoun to delete',
                required: true,
                schema: {
                    type: 'string'
                }
            }],
            security: [{
                User: []
            }],
            responses: {
                '200': {
                    description: 'The pronoun was successfully deleted'
                },
                '401': {
                    description: 'An invalid authorization token was provided',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Unauthorized'
                            }
                        }
                    }
                },
                '422': {
                    description: 'Invalid data was provided.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/BadRequest'
                            }
                        }
                    }
                },
                '500': {
                    description: 'An unknown internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                description: 'The error response',
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
                },
                '403': {
                    description: 'The request was forbidden',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                description: 'The error response',
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
            tags: ['Pronouns']
        }
    }
})
export default class PronounsRoute extends Route {
    private rateLimiter = new RateLimiterMemory({
        points: 3,
        duration: 10
    });

    async post(req: Request, res: Response) {
        try {
            s.object({
                pronoun: s.string,
                singular: s.string,
                description: s.string,
                ownership: s.string,
            }).parse(req.body)
        } catch {
            res.status(422).send({
                error: 1,
                message: 'Valid pronoun data was not provided'
            })
            return
        }
        const token = req.headers.authorization?.replace?.('Bearer ', '')
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
        if (!verifiedJwt) {
            res.status(401).send({
                error: 3,
                message: 'Invalid token'
            })
            return
        }
        try {
            const rateLimitData = await this.rateLimiter.consume(verifiedJwt.payload.sub!)
            res.header("X-RateLimit-Limit", '3')
            res.header("X-RateLimit-Remaining", rateLimitData.remainingPoints.toString())
            res.header("X-RateLimit-Reset", new Date(Date.now() + rateLimitData.msBeforeNext).getTime().toString())
        } catch (e) {
            const rateLimitData = e as RateLimiterRes
            res.header("Retry-After", (rateLimitData.msBeforeNext / 1000).toString())
            res.header("X-RateLimit-Limit", '3')
            res.header("X-RateLimit-Remaining", rateLimitData.remainingPoints.toString())
            res.header("X-RateLimit-Reset", new Date(Date.now() + rateLimitData.msBeforeNext).getTime().toString())
            res.status(429).send({
                error: 4,
                message: 'Too many requests, you are being ratelimited'
            })
            return
        }
        const user = await User.findOne({
            where: {
                id: verifiedJwt.payload.sub
            }
        })
        if (!user) {
            res.status(500).send({
                error: 5,
                message: 'Unknown internal server error'
            })
            return
        }
        const userCreatedPronouns = await Pronoun.count({
            where: {
                creatorId: user.id
            }
        })
        if (userCreatedPronouns >= 10) {
            res.status(422).send({
                error: 6,
                message: 'You can only create up to 10 custom pronouns per user.'
            })
            return
        }
        const pronoun = await Pronoun.create({
            creatorId: user.id,
            pronoun: req.body.pronoun,
            subject: req.body.subject,
            object: req.body.object,
            possessiveDeterminer: req.body.possessiveDeterminer,
            possessivePronoun: req.body.possessivePronoun,
            reflexive: req.body.reflexive,
        })
        res.send({
            id: pronoun.id,
            creatorId: pronoun.creatorId,
            pronoun: pronoun.pronoun,
            subject: pronoun.subject,
            object: pronoun.object,
            possessiveDeterminer: pronoun.possessiveDeterminer,
            possessivePronoun: pronoun.possessivePronoun,
            reflexive: pronoun.reflexive,
            pronoundb: pronoun.pronoundb
        })
    }

    async delete(req: Request, res: Response) {
        try {
            s.object({
                id: s.string
            }).parse(req.query)
        } catch {
            res.status(422).send({
                error: 1,
                message: 'Pronoun ID was not provided'
            })
            return
        }
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
        if (!verifiedJwt) {
            res.status(401).send({
                error: 3,
                message: 'Invalid token'
            })
            return
        }
        const pronoun = await Pronoun.findByPk(req.query.id as string)
        if (!pronoun) {
            res.status(422).send({
                error: 7,
                message: 'Invalid pronoun ID'
            })
            return
        }
        const user = await User.findOne({
            where: {
                id: verifiedJwt.payload.sub
            }
        })
        if (!user) {
            res.status(500).send({
                error: 5,
                message: 'Unknown internal server error'
            })
            return
        }
        if (pronoun.creatorId !== user.id) {
            res.status(403).send({
                error: 8,
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
            res.status(403).send({
                error: 9,
                message: 'You cannot delete this pronoun, as someone is currently using it.'
            })
            return
        }
        await pronoun.destroy();
        res.status(200).send();
    }
}