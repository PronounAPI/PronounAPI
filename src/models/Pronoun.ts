import { randomBytes } from "crypto";
import { DataTypes, Model, Optional, Sequelize } from "sequelize";

interface PronounModelAttributes {
    id: string;
    creatorId: number;
    pronoun: string;
    pronoundb: string|null;
    subject: string;
    object: string;
    possessiveDeterminer: string;
    possessivePronoun: string;
    reflexive: string;
    subpronouns: string[];
}

interface PronounModelCreationAttributes {
    id?: string;
    creatorId: number|null;
    pronoun: string;
    pronoundb?: string|null;
    subject: string;
    object: string;
    possessiveDeterminer: string;
    possessivePronoun: string;
    reflexive: string;
    subpronouns?: string[];
}

export class Pronoun extends Model<PronounModelAttributes, PronounModelCreationAttributes> {
    declare readonly createdAt: Date
    declare readonly updatedAt: Date

    declare id: string;
    declare pronoun: string;
    declare pronoundb: string|null;
    declare creatorId: number|null;
    declare subject: string;
    declare object: string;
    declare possessiveDeterminer: string;
    declare possessivePronoun: string;
    declare reflexive: string;
    declare subpronouns: string[];

    static initModel(sequelize: Sequelize) {
        Pronoun.init({
            id: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                defaultValue: () => randomBytes(20).toString('hex')
            },
            creatorId: {
                type: DataTypes.INTEGER,
                primaryKey: false,
                allowNull: true
            },
            pronoundb: {
                type: DataTypes.STRING,
                primaryKey: false,
                allowNull: true,
                defaultValue: null
            },
            pronoun: {
                type: DataTypes.STRING,
                primaryKey: false,
                allowNull: false
            },
            subject: {
                type: DataTypes.STRING,
                primaryKey: false,
                allowNull: false
            },
            object: {
                type: DataTypes.STRING,
                primaryKey: false,
                allowNull: false
            },
            possessiveDeterminer: {
                type: DataTypes.STRING,
                primaryKey: false,
                allowNull: false
            },
            possessivePronoun: {
                type: DataTypes.STRING,
                primaryKey: false,
                allowNull: false
            },
            reflexive: {
                type: DataTypes.STRING,
                primaryKey: false,
                allowNull: false
            },
            subpronouns: {
                type: DataTypes.ARRAY(DataTypes.STRING),
                primaryKey: false,
                allowNull: false,
                defaultValue: []
            }
        }, { sequelize })
    }
}