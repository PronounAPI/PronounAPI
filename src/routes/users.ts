import { s } from "@sapphire/shapeshift";
import { Middleware, Route, RouteOptions } from "@tyman/modulo";
import { Request, Response } from "express";
import { jwtVerify } from "jose";
import { Op } from "sequelize";
import { Pronoun } from "../models/Pronoun";
import { User } from "../models/User";
import { HMACToken } from "../index";

@RouteOptions({
    path: '/api/v1/users',
    middleware: [Middleware.Json],
    spec: {
        post: {
            description: 'Registers a user based on the authorization token and the given user data',
            security: [{
                Bearer: []
            }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/UserOptions'
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'The user was successfully registered'
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
            },
            tags: ['Users']
        },
        patch: {
            description: 'Registers a user based on the authorization token and the given user data. Just like POST, except all user options are optional',
            security: [{
                Bearer: []
            }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/UserOptions'
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'The user was successfully edited'
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
            },
            tags: ['Users']
        }
    }
})
export default class UsersRoute extends Route {
    async post(req: Request, res: Response) {
        try {
            s.object({
                preferredPronounId: s.string,
                extraPronounIds: s.array(s.string),
                randomizedSubpronouns: s.boolean
            }).parse(req.body)
        } catch {
            res.status(422).send({
                error: 1,
                message: 'Valid user data was not provided'
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
        const verifiedJwt = await jwtVerify(token, HMACToken, {
            issuer: 'pronoundb-custom'
        }).catch(e => null)
        if (!verifiedJwt) {
            res.status(401).send({
                error: 3,
                message: 'Invalid token'
            })
            return
        }
        const [userModel, built] = await User.findOrBuild({
            where: {
                discord: verifiedJwt.payload.sub
            },
            defaults: {
                discord: verifiedJwt.payload.sub
            }
        })
        if (!built) {
            res.status(422).send({
                error: 7,
                message: 'User already exists, to update user use PATCH.'
            })
            return
        }
        const pronoun = await Pronoun.findByPk(req.body.preferredPronounId)
        if (!pronoun) {
            res.status(422).send({
                error: 7,
                message: 'Invalid pronoun ID'
            })
            return
        }
        userModel.preferredPronoun = pronoun.id
        if (req.body.extraPronounIds.length >= 1) {
            const {rows: pronouns, count} = await Pronoun.findAndCountAll({
                where: {
                    id: {
                        [Op.or]: req.body.extraPronounIds
                    }
                }
            })
            if (count < req.body.extraPronounIds.length) {
                res.status(422).send({
                    error: 7,
                    message: 'Could not find all extra pronouns in database, are they all valid?'
                })
                return
            }
            userModel.extraPronouns = pronouns.map(p => p.id)
        } else {
            userModel.extraPronouns = [];
        }
        userModel.randomizedSubpronouns = req.body.randomizedSubpronouns
        await userModel.save()
        res.status(200).send()
    }

    async patch(req: Request, res: Response) {
        try {
            s.object({
                preferredPronounId: s.string,
                extraPronounIds: s.array(s.string),
                randomizedSubpronouns: s.boolean
            }).partial.parse(req.body)
        } catch {
            res.status(422).send({
                error: 1,
                message: 'Valid user data was not provided'
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
        const verifiedJwt = await jwtVerify(token, HMACToken, {
            issuer: 'pronoundb-custom'
        }).catch(e => null)
        if (!verifiedJwt) {
            res.status(401).send({
                error: 3,
                message: 'Invalid token'
            })
            return
        }
        const userModel = await User.findOne({
            where: {
                discord: verifiedJwt.payload.sub
            }
        })
        if (!userModel) {
            res.status(422).send({
                error: 7,
                message: 'User is not registered, please send a POST with this user\'s initial data.'
            })
            return
        }
        if (req.body.preferredPronounId) {
            const pronoun = await Pronoun.findByPk(req.body.preferredPronounId)
            if (!pronoun) {
                res.status(422).send({
                    error: 7,
                    message: 'Invalid pronoun ID'
                })
                return
            }
            userModel.preferredPronoun = pronoun.id
        }
        if (req.body.extraPronounIds.length >= 1) {
            const {rows: pronouns, count} = await Pronoun.findAndCountAll({
                where: {
                    id: {
                        [Op.or]: req.body.extraPronounIds
                    }
                }
            })
            if (count < req.body.extraPronounIds.length) {
                res.status(422).send({
                    error: 7,
                    message: 'Could not find all extra pronouns in database, are they all valid?'
                })
                return
            }
            userModel.extraPronouns = pronouns.map(p => p.id)
        } else if (req.body.extraPronounIds) {
            userModel.extraPronouns = [];
        }
        if (req.body.randomizedSubpronouns) {
            userModel.randomizedSubpronouns = req.body.randomizedSubpronouns
        }
        await userModel.save()
        res.status(200).send()
    }
}