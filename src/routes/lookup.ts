import { Route, RouteOptions } from '@tyman/modulo';
import { Request, Response } from 'express';
import got, { HTTPError } from 'got';
import { Op } from 'sequelize';
import { Pronoun } from '../models/Pronoun';
import { User } from '../models/User';
import { s } from '@sapphire/shapeshift';
import { PronounType, SupportedPlatforms } from '../index';

interface PronounDBResponse {
    pronouns: string
}

@RouteOptions({
    path: '/api/v1/lookup',
    spec: {
        get: {
            description: 'Lookup a user from the database. Will fallback to pronoundb compatibility if the specified user is not found',
            parameters: [
                {
                    in: 'query',
                    name: 'id',
                    description: 'The ID of the user to lookup',
                    required: true,
                    schema: {
                        type: 'string'
                    }
                },
                {
                    in: 'query',
                    name: 'platform',
                    description: 'The platform of the user to lookup',
                    required: true,
                    schema: {
                        type: 'string',
                        enum: [
                            'discord',
                            'facebook',
                            'github',
                            'twitch',
                            'twitter',
                            'minecraft'
                        ]
                    }
                }
            ],
            responses: {
                '200': {
                    description: 'The found user data',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                description: 'The user\'s pronouns',
                                properties: {
                                    userId: {
                                        type: 'string',
                                        description: 'The ID of the fetched user'
                                    },
                                    platform: {
                                        type: 'string',
                                        enum: [
                                            'discord',
                                            'facebook',
                                            'github',
                                            'twitch',
                                            'twitter',
                                            'minecraft'
                                        ],
                                        description: 'The platform used to find this user'
                                    },
                                    preferredPronoun: {
                                        $ref: '#/components/schemas/Pronoun'
                                    },
                                    extraPronouns: {
                                        type: "array",
                                        description: "An array of extra pronouns that this user has set",
                                        items: {
                                            $ref: "#/components/schemas/Pronoun"
                                        }
                                    },
                                    pronoundbCompat: {
                                        type: 'boolean',
                                        default: 'Whether or not this pronoun was fetched from pronoundb because it was not stored in the normal database.',
                                        example: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            tags: ['Query']
        }
    }
})
export default class LookupRoute extends Route {
    async get(req: Request, res: Response) {
        try {
            s.object({
                platform: s.enum(
                    'discord',
                    'facebook',
                    'github',
                    'twitch',
                    'twitter',
                    'minecraft'
                ),
                id: s.string
            }).parse(req.query);
        } catch {
            res.status(422).send({
                error: 1,
                message: 'Please provide both a valid platform and id in url.'
            });
            return;
        }
        if (req.query.platform !== 'discord') return this.getPronoundbCompat(req, res);
        const userModel = await User.findOne({
            where: {
                [req.query.platform as SupportedPlatforms]: req.query.id as string
            }
        });
        if (!userModel) return this.getPronoundbCompat(req, res);
        const pronoun = (await Pronoun.findByPk(userModel.preferredPronoun))!
        const pronounData = {
            id: pronoun.id,
            pronoundb: pronoun.pronoundb,
            pronoun: pronoun.pronoun,
            subject: pronoun.subject,
            object: pronoun.object,
            possessiveDeterminer: pronoun.possessiveDeterminer,
            possessivePronoun: pronoun.possessivePronoun,
            reflexive: pronoun.reflexive,
            subpronouns: pronoun.subpronouns
        }
        if (pronounData.subpronouns.length >= 2 && userModel.randomizedSubpronouns) {
            const randomizedPronoun = (await Pronoun.findByPk(pronoun.subpronouns[Math.floor(Math.random()*pronoun.subpronouns.length)]))!;
            pronounData.pronoun = `${randomizedPronoun.pronoun} (${pronoun.pronoun})`   
            pronounData.subject = randomizedPronoun.subject
            pronounData.object = randomizedPronoun.object
            pronounData.possessiveDeterminer = randomizedPronoun.possessiveDeterminer
            pronounData.possessivePronoun = randomizedPronoun.possessivePronoun
            pronounData.reflexive = randomizedPronoun.reflexive
        }
        let extraPronounData: PronounType[] = [];
        if (userModel.extraPronouns.length >= 1) {
            const extraPronouns = await Pronoun.findAll({
                where: {
                    id: {
                        [Op.or]: userModel.extraPronouns
                    }
                }
            })
            extraPronounData = extraPronouns.map(p => ({
                id: p.id,
                pronoundb: p.pronoundb,
                pronoun: p.pronoun,
                subject: p.subject,
                object: p.object,
                possessiveDeterminer: p.possessiveDeterminer,
                possessivePronoun: p.possessivePronoun,
                reflexive: p.reflexive,
                subpronouns: p.subpronouns
            }))
            for (const [i, extraPronoun] of extraPronounData.entries()) {
                if (extraPronoun.subpronouns.length >= 2 && userModel.randomizedSubpronouns) {
                    const randomizedPronoun = (await Pronoun.findByPk(extraPronoun.subpronouns[Math.floor(Math.random()*pronoun.subpronouns.length)]))!;
                    extraPronounData[i].pronoun = `${randomizedPronoun.pronoun} (${extraPronoun.pronoun})`   
                    extraPronounData[i].subject = randomizedPronoun.subject
                    extraPronounData[i].object = randomizedPronoun.object
                    extraPronounData[i].possessiveDeterminer = randomizedPronoun.possessiveDeterminer
                    extraPronounData[i].possessivePronoun = randomizedPronoun.possessivePronoun
                    extraPronounData[i].reflexive = randomizedPronoun.reflexive
                }
            }
        }
        
        res.send({
            userId: req.query.id,
            platform: req.query.platform,
            preferredPronoun: pronounData,
            extraPronouns: extraPronounData,
            pronoundbCompat: false
        })
    }

    async getPronoundbCompat(req: Request, res: Response) {
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
        const defaultPronouns = await Pronoun.findAll({
            where: {
                creatorId: null
            }
        })
        const pronounDetails = defaultPronouns.find(p => p.pronoundb === pronoundbResponse.pronouns)!
        res.send({
            userId: req.query.id,
            platform: req.query.platform,
            preferredPronoun: {
                id: pronounDetails.id,
                pronoundb: pronounDetails.pronoundb,
                pronoun: pronounDetails.pronoun,
                subject: pronounDetails.subject,
                object: pronounDetails.object,
                possessiveDeterminer: pronounDetails.possessiveDeterminer,
                possessivePronoun: pronounDetails.possessivePronoun,
                reflexive: pronounDetails.reflexive,
                subpronouns: pronounDetails.subpronouns
            },
            extraPronouns: [],
            pronoundbCompat: true
        })
    }
}
