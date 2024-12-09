import mongoose from "mongoose";
import { userModelDefinition } from "./User.js";
import { openAIChatModelDefinition } from "./OpenAIChat.js";
import { userSubscriptionUsageModelDefinition } from "./UserSubscriptionUsage.js";
import type { FlattenToObjectIDs, MongooseModelDefinition } from "../lib/model.type.js";
import type { OpenAIMessageDBModel } from "../../../../../../types/entities/openAIMessage.js";

type OpenAIMessageMongoStored = FlattenToObjectIDs<OpenAIMessageDBModel, 'chat' | 'usages' | 'promptUser'>;

export const openAIMessageModelDefinition: MongooseModelDefinition<"openAIMessages", "OpenAIMessage", OpenAIMessageMongoStored> = Object.freeze({
    model: "OpenAIMessage",
    collection: "openAIMessages",
    createModel: con => con.models[openAIMessageModelDefinition.model] || con.model(openAIMessageModelDefinition.model, schema)
});

const schema = new mongoose.Schema<OpenAIMessageMongoStored>({
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
    model: {
        type: String,
        required: true,
    },
    cost: {
        type: Number,
        required: true,
    },
    responseTime: {
        type: Number,
        required: true,
    },
    chat: {
        type: mongoose.Types.ObjectId,
        ref: openAIChatModelDefinition.model,
        required: true
    },
    usages: {
        type: [mongoose.Types.ObjectId],
        ref: userSubscriptionUsageModelDefinition.model,
        required: true
    },
    promptUser: {
        type: mongoose.Types.ObjectId,
        ref: userModelDefinition.model,
        required: true
    },
    prompt: {
        type: String,
        required: true
    },
    output: {
        type: String,
        required: true
    },
    saved: {
        type: Boolean,
        required: true,
        default: false
    },
    fileId: {
        type: String,
        required: false
    }
}, { versionKey: false, collection: openAIMessageModelDefinition.collection });
