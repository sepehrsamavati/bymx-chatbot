import mongoose from "mongoose";
import { userModelDefinition } from "./User.js";
import { planModelDefinition } from "./Plan.js";
import type { UserSubscriptionDBModel } from "../../../../../../types/entities/userSubscription.js";
import type { FlattenToObjectIDs, MongooseModelDefinition, MongoStored } from "../lib/model.type.js";

type UserSubscriptionMongoStored = MongoStored<FlattenToObjectIDs<UserSubscriptionDBModel, 'user'>>;

export const userSubscriptionModelDefinition: MongooseModelDefinition<"userSubscriptions", "UserSubscription", UserSubscriptionMongoStored> = Object.freeze({
    model: "UserSubscription",
    collection: "userSubscriptions",
    createModel: con => con.models[userSubscriptionModelDefinition.model] || con.model(userSubscriptionModelDefinition.model, schema)
});

const schema = new mongoose.Schema<UserSubscriptionMongoStored>({
    insertDate: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: userModelDefinition.model,
        required: true
    },
    plan: {
        id: {
            type: mongoose.Types.ObjectId,
            ref: planModelDefinition.model,
            required: true
        },
        type: {
            type: Number,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        points: {
            type: Number,
            required: true,
        },
    },
    expiry: {
        type: Date,
        required: true,
    },
    isFinished: {
        type: Boolean,
        required: true,
        default: false
    }
}, { versionKey: false, collection: userSubscriptionModelDefinition.collection });
