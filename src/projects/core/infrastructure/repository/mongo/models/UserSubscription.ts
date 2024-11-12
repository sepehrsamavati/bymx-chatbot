import mongoose from "mongoose";
import { userModelDefinition } from "./User.js";
import { openAIPlanModelDefinition } from "./OpenAIPlan.js";
import type { UserSubscriptionDBModel } from "../../../../../../types/entities/userSubscription.js";
import type { FlattenToObjectIDs, MongooseModelDefinition, MongoStored } from "../lib/model.type.js";

type UserSubscriptionMongoStored = MongoStored<FlattenToObjectIDs<UserSubscriptionDBModel, 'user' | 'plan'>>;

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
        type: mongoose.Types.ObjectId,
        ref: openAIPlanModelDefinition.model,
        required: true
    },
    expiry: {
        type: Date,
        required: true,
    },
    finished: {
        type: Boolean,
        required: true,
        default: false
    }
}, { versionKey: false, collection: userSubscriptionModelDefinition.collection });
