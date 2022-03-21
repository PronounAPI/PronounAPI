import { s } from "@sapphire/shapeshift";
import { Middleware, Route, RouteOptions } from "@tyman/modulo";
import { Request, Response } from "express";
import { jwtVerify } from "jose";
import { Op } from "sequelize";
import { Pronoun } from "../../models/Pronoun";
import { User } from "../../models/User";
import { HMACToken, SupportedPlatforms } from "../../index";

@RouteOptions({
    path: '/api/v1/users',
    middleware: [Middleware.Json],
    spec: {
        patch: {
            description: 'Modifies a user based on the authorization token and the given user data.',
            security: [{
                User: []
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
        },
        delete: {
            description: 'Deletes a user based on the authorization token.',
            security: [{
                User: []
            }],
            responses: {
                '200': {
                    description: 'The user was successfully deleted'
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
            },
            tags: ['Users']
        }
    }
})
export default class UsersRoute extends Route {
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
                id: verifiedJwt.payload.sub
            }
        })
        if (!userModel) {
            res.status(500).send({
                error: 5,
                message: 'Unknown internal server error'
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