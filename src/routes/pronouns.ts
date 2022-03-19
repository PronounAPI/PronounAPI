import { Middleware, Route, RouteOptions } from "@tyman/modulo";
import { Request, Response } from "express";
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { s } from '@sapphire/shapeshift';
import { jwtVerify } from "jose";
import CallbackRoute from "./callback";
import { User } from "../models/User";
import { Pronoun } from "../models/Pronoun";

@RouteOptions({
    path: '/api/v1/pronouns',
    middleware: [Middleware.Json],
    spec: {}
})
export default class PronounsRoute extends Route {
    private rateLimiter = new RateLimiterMemory({
        points: 3,
        duration: 10
    });

    async post(req: Request, res: Response) {
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
                error: 1,
                message: 'Authorization or all pronoun data was not provided'
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
                discord: verifiedJwt.payload.sub
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
                discord: verifiedJwt.payload.sub
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