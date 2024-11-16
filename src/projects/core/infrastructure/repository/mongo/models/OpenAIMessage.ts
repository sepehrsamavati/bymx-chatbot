import mongoose from "mongoose";
import { openAIChatModelDefinition } from "./OpenAIChat";
import { openAIPlanModelDefinition } from "./OpenAIPlan";
import type { FlattenToObjectIDs, MongooseModelDefinition } from "../lib/model.type.js";
import type { OpenAIMessageDBModel } from "../../../../../../types/entities/openAIMessage.js";

type OpenAIMessageMongoStored = FlattenToObjectIDs<OpenAIMessageDBModel, 'chat'>;

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
    chat: {
        type: mongoose.Types.ObjectId,
        ref: openAIChatModelDefinition.model,
        required: true
    },
    plan: {
        type: mongoose.Types.ObjectId,
        ref: openAIPlanModelDefinition.model,
        required: false
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
