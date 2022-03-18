import { User } from './models/User';
import { randomBytes } from 'crypto';
import { Pronoun } from './models/Pronoun';
import { promises as fs } from 'fs'
import path from 'path'
import { Sequelize, Op } from 'sequelize';
import * as config from './config'

interface PronounType {
    id: string;
    pronoundb: string;
    pronoun: string;
    singular: string;
    ownership: string;
    description: string;
    subpronouns?: string[];
}

export const sequelize = new Sequelize({
    dialect: 'postgres',
    ...config.database,
    logging: false
});
const HMACToken = randomBytes(512);

interface PronounDBResponse {
    pronouns: string
}

interface CodeGrantResponse {
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh_token: string,
    scope: string
}

interface UserResponse {
    id: string,
    username: string,
    avatar: string,
    discriminator: string,
    public_flags: number,
    flags: number,
    banner: string|null,
    banner_color: number|null,
    accent_color: number|null,
    locale: string,
    mfa_enabled: boolean
}

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
})()
