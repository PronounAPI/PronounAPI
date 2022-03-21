import { User } from './models/User';
import { Pronoun } from './models/Pronoun';
import { promises as fs } from 'fs'
import path from 'path'
import { Sequelize, Op } from 'sequelize';
import * as config from './config'
import { RouteManager } from '@tyman/modulo';
import cors from 'cors';
import { randomBytes } from 'crypto';

export interface PronounType {
    id: string;
    pronoundb: string|null;
    pronoun: string;
    subject: string;
    object: string;
    possessiveDeterminer: string;
    possessivePronoun: string;
    reflexive: string;
    subpronouns: string[];
}

export type SupportedPlatforms = 'discord' | 'minecraft'
export type Platforms = SupportedPlatforms | 'facebook' | 'github' | 'twitch' | 'twitter'

export const sequelize = new Sequelize({
    dialect: 'postgres',
    ...config.database,
    logging: false
});

export const HMACToken = randomBytes(512);

(async () => {
    await sequelize.authenticate()
    Pronoun.initModel(sequelize)
    User.initModel(sequelize)
    await sequelize.sync({alter: true})
    const defaultPronounFiles = await fs.readdir(path.join(__dirname, 'pronouns'))
    const defaultPronouns = await Promise.all(
        defaultPronounFiles.map(f => import(
            path.join(__dirname, 'pronouns', f)
        ).then(i => i.default) as Promise<PronounType>)
    )
    const defaultPronounsDB = await Pronoun.findAll({
        where: {
            id: {
                [Op.any]: defaultPronouns.map(p => p.id)
            }
        }
    })
    // I am bad at naming vars
    let defaultPronounsWithoutDBEntry: PronounType[] = [];
    for (const pronoun of defaultPronouns) {
        if (!defaultPronounsDB.find(dbp => dbp.id === pronoun.id)) {
            defaultPronounsWithoutDBEntry.push(pronoun)
        }
    }
    await Pronoun.bulkCreate(defaultPronounsWithoutDBEntry.map(p => ({
        ...p,
        creatorId: null
    })))

    const routeManager = new RouteManager(path.join(__dirname, 'routes'), {
        openapi: '3.0.0',
        info: {
            title: 'Pronoundb-custom',
            description: 'A remake based on pronoundb, that maintains compatibility with the original',
            license: {
                name: 'NPOSL-3.0',
                url: 'https://opensource.org/licenses/NPOSL-3.0'
            },
            version: '1.0.0'
        },
        components: {
            schemas: {
                Pronoun: {
                    type: 'object',
                    description: 'Details about a pronoun',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID of this pronoun. It is representative of the pronoun if it is a default pronoun, otherwise it is randomly generated.',
                            example: 'itIts'
                        
                        },
                        pronoundb: {
                            type: 'string',
                            nullable: true,
                            description: 'The pronoundb ID for this pronoun, or null if there is no corrosponding pronoundb form.',
                            example: 'ii'
                        },
                        pronoun: {
                            type: 'string',
                            description: 'The pronoun\'s nice name',
                            example: 'it/its'
                        },
                        subject: {
                            type: 'string',
                            description: 'The subject form of this pronoun',
                            example: 'them'
                        },
                        object: {
                            type: 'string',
                            description: 'The object form of this pronoun',
                            example: 'they'
                        },
                        possessiveDeterminer: {
                            type: 'string',
                            description: 'The possessive determiner form of this pronoun',
                            example: 'their'
                        },
                        possessivePronoun: {
                            type: 'string',
                            description: 'The possessive pronoun form of this pronoun',
                            example: 'theirs'
                        },
                        reflexive: {
                            type: 'string',
                            description: 'The reflexive form of this pronoun',
                            example: 'themselves'
                        },
                        subpronouns: {
                            type: 'array',
                            description: 'An array of other pronoun IDs that this pronoun contains (for pronouns like he/she or they/it)',
                            items: {
                                "$ref": "#/components/schemas/Pronoun"
                            }
                        }
                    }
                },
                UserOptions: {
                    type: 'object',
                    description: 'User options provided to both POST and PATCH /api/v1/users',
                    properties: {
                        preferredPronounId: {
                            type: 'string',
                            description: 'The ID of the preferred pronoun of this user',
                            example: 'itIts'
                        },
                        extraPronounIds: {
                            type: 'array',
                            description: 'An array of extra pronoun IDs for this user',
                            items: {
                                type: 'string',
                                description: 'The ID of an extra pronoun of this user'
                            },
                            example: ['sheHer', 'heHim']
                        },
                        randomizedSubpronouns: {
                            type: 'boolean',
                            description: 'Whether or not to randomize the pronoun forms of this user from the subpronouns (e.g. he/she will either be he/him or she/him',
                            example: false
                        },
                        discordToken: {
                            type: 'string',
                            description: 'A proof JWT token returned from the discord callback'
                        },
                        minecraftToken: {
                            type: 'string',
                            description: 'A proof JWT token returned from the minecraft callback'
                        }
                    },
                    required: []
                },
                BadRequest: {
                    type: 'object',
                    description: 'Invalid data was provided to the server',
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
                },
                Unauthorized: {
                    type: 'object',
                    description: 'Invalid or missing authorization was sent',
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
            },
            securitySchemes: {
                Proof: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'A token proving ownership of an account on one of the supported platforms. These are issued by /api/v1/callback endpoints.'
                },
                User: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Used as authorization by all endpoints based around users. These are only issued by the /api/v1/users/login endpoint.'
                }
            }            
        },
        paths: {}
    }, [cors()])
    await routeManager.loadRoutes()
    await routeManager.serve(3000)
})()
