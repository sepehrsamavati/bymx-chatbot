import mongoose from "mongoose";
import { userModelDefinition } from "./User.js";
import { aiChatModelDefinition } from "./AIChat.js";
import type { PromptDBModel } from "../../../../../../types/entities/prompt.js";
import { userSubscriptionUsageModelDefinition } from "./UserSubscriptionUsage.js";
import type { FlattenToObjectIDs, MongooseModelDefinition } from "../lib/model.type.js";

type PromptMongoStored = FlattenToObjectIDs<PromptDBModel, 'chat' | 'usages' | 'promptUser'>;

export const promptModelDefinition: MongooseModelDefinition<"prompts", "Prompt", PromptMongoStored> = Object.freeze({
    model: "Prompt",
    collection: "prompts",
    createModel: con => con.models[promptModelDefinition.model] || con.model(promptModelDefinition.model, schema)
});

const schema = new mongoose.Schema<PromptMongoStored>({
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
        ref: aiChatModelDefinition.model,
        required: false
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
    input: {
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
}, { versionKey: false, collection: promptModelDefinition.collection });
