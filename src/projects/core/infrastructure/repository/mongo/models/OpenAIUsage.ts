import mongoose from "mongoose";
import { userModelDefinition } from "./User.js";
import { openAIModelModelDefinition } from "./OpenAIModel.js";
import type { FlattenToObjectIDs, MongooseModelDefinition } from "../lib/model.type.js";
import type { OpenAIUsageDBModel } from "../../../../../../types/entities/openAIUsage.js";

export type OpenAIUsageMongoStored = FlattenToObjectIDs<OpenAIUsageDBModel, 'user' | 'model'>;

export const openAIUsageModelDefinition: MongooseModelDefinition<"openAIUsages", "OpenAIUsage", OpenAIUsageMongoStored> = Object.freeze({
    model: "OpenAIUsage",
    collection: "openAIUsages",
    createModel: con => con.models[openAIUsageModelDefinition.model] || con.model(openAIUsageModelDefinition.model, schema)
});

const schema = new mongoose.Schema<OpenAIUsageMongoStored>({
    insertDate: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false
    },
    points: {
        type: Number,
        required: true,
        min: 0,
    },
    cost: {
        type: Number,
        required: true,
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: userModelDefinition.model,
        required: true
    },
    model: {
        type: mongoose.Types.ObjectId,
        ref: openAIModelModelDefinition.model,
        required: true
    },
}, { versionKey: false, collection: openAIUsageModelDefinition.collection });
