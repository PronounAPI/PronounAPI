import { DataTypes, Model, Sequelize } from "sequelize";
import { pronounMap } from "../constants";

interface UserModelAttributes {
    id: number;
    preferredPronoun: string;
    discord: string;
    randomizedAny: boolean;
}

export class User extends Model<UserModelAttributes, Partial<UserModelAttributes>> {
    declare readonly createdAt: Date
    declare readonly updatedAt: Date

    declare id: number;
    declare discord: string|null;
    declare randomizedAny: boolean;

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
                defaultValue: 'unspecified',
                validate: {
                    isIn: [Object.keys(pronounMap)]
                }
            },
            discord: {
                type: DataTypes.STRING,
                primaryKey: false,
                allowNull: true,
                unique: true
            },
            randomizedAny: {
                type: DataTypes.BOOLEAN,
                primaryKey: false,
                allowNull: false,
                defaultValue: false
            }
        }, { sequelize })
    }
}