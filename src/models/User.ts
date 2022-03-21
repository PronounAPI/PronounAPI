import { DataTypes, Model, Sequelize } from "sequelize";

interface UserModelAttributes {
    id: number;
    preferredPronoun: string;
    extraPronouns: string[];
    discord: string;
    minecraft: string;
    randomizedSubpronouns: boolean;
}

export class User extends Model<UserModelAttributes, Partial<UserModelAttributes>> {
    declare readonly createdAt: Date
    declare readonly updatedAt: Date

    declare id: number;
    declare discord: string|null;
    declare minecraft: string|null;
    declare preferredPronoun: string;
    declare extraPronouns: string[];
    declare randomizedSubpronouns: boolean;

    static initModel(sequelize: Sequelize) {
        User.init({
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            preferredPronoun: {
                type: DataTypes.STRING,
                primaryKey: false,
                allowNull: false,
                defaultValue: () => 'unspecified',
                references: {
                    model: 'Pronouns'
                }
            },
            extraPronouns: {
                type: DataTypes.ARRAY(DataTypes.STRING),
                primaryKey: false,
                allowNull: false,
                defaultValue: []
            },
            discord: {
                type: DataTypes.STRING,
                primaryKey: false,
                allowNull: true,
                unique: true
            },
            minecraft: {
                type: DataTypes.STRING,
                primaryKey: false,
                allowNull: true,
                unique: true
            },
            randomizedSubpronouns: {
                type: DataTypes.BOOLEAN,
                primaryKey: false,
                allowNull: false,
                defaultValue: false
            }
        }, { sequelize })
    }
}