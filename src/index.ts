import { User } from './models/User';
import { Pronoun } from './models/Pronoun';
import { promises as fs } from 'fs'
import path from 'path'
import { Sequelize, Op } from 'sequelize';
import * as config from './config'
import { RouteManager } from '@tyman/modulo';
import cors from 'cors';

export interface PronounType {
    id: string;
    pronoundb: string|null;
    pronoun: string;
    singular: string;
    ownership: string;
    description: string;
    subpronouns: string[];
}

export const sequelize = new Sequelize({
    dialect: 'postgres',
    ...config.database,
    logging: false
});

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
                        singular: {
                            type: 'string',
                            description: 'The singular form of this pronoun',
                            example: 'it'
                        },
                        description: {
                            type: 'string',
                            description: 'The descriptive form of this pronoun',
                            example: 'it'
                        },
                        ownership: {
                            type: 'string',
                            description: 'The posessive form of this pronoun',
                            example: 'its'
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
                BadRequest: {
                    type: 'object',
                    description: 'Invalid data was provided to the server',
                    properties: {
                        error: {
                            type: 'string',
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
                Bearer: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        paths: {}
    }, [cors()])
    await routeManager.loadRoutes()
    await routeManager.serve(3000)
})()
