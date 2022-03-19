import { s } from "@sapphire/shapeshift";
import { Middleware, Route, RouteOptions } from "@tyman/modulo";
import { Request, Response } from "express";
import { jwtVerify } from "jose";
import { Op } from "sequelize";
import { Pronoun } from "../models/Pronoun";
import { User } from "../models/User";
import CallbackRoute from "./callback";

@RouteOptions({
    path: '/api/v1/users',
    middleware: [Middleware.Json],
    spec: {}
})
export default class UsersRoute extends Route {
    async patch(req: Request, res: Response) {
        try {
            s.object({
                preferredPronounId: s.string,
                extraPronounIds: s.array(s.string),
                randomizedAny: s.boolean
            }).partial.parse(req.body)
        } catch {
            res.status(422).send({
                error: 1,
                message: 'Authorization or valid user data was not provided'
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
        const verifiedJwt = await jwtVerify(token, CallbackRoute.HMACToken, {
            issuer: 'pronoundb-custom'
        }).catch(e => null)
        if (!verifiedJwt) {
            res.status(401).send({
                error: 3,
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