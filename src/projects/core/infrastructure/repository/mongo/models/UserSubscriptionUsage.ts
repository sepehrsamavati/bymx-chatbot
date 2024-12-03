import mongoose from "mongoose";
import { userSubscriptionModelDefinition } from "./UserSubscription.js";
import type { FlattenToObjectIDs, MongooseModelDefinition, MongoStored } from "../lib/model.type.js";
import { UserSubscriptionUsageDBModel } from "../../../../../../types/entities/userSubscriptionUsage.js";

type UserSubscriptionUsageMongoStored = MongoStored<FlattenToObjectIDs<UserSubscriptionUsageDBModel, 'userSubscription'>>;

export const userSubscriptionUsageModelDefinition: MongooseModelDefinition<"userSubscriptionUsages", "UserSubscriptionUsage", UserSubscriptionUsageMongoStored> = Object.freeze({
    model: "UserSubscriptionUsage",
    collection: "userSubscriptionUsages",
    createModel: con => con.models[userSubscriptionUsageModelDefinition.model] || con.model(userSubscriptionUsageModelDefinition.model, schema)
});

const schema = new mongoose.Schema<UserSubscriptionUsageMongoStored>({
    insertDate: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false
    },
    userSubscription: {
        type: mongoose.Types.ObjectId,
        ref: userSubscriptionModelDefinition.model,
        required: true
    },
    points: {
        type: Number,
        required: true,
        min: 0
    },
}, { versionKey: false, collection: userSubscriptionUsageModelDefinition.collection });
