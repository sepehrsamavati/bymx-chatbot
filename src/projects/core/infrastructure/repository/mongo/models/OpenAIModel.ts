import mongoose from "mongoose";
import type { MongooseModelDefinition, MongoStored } from "../lib/model.type.js";
import { OpenAIModelType } from "../../../../../../types/enums/openAIModelType.js";
import type { OpenAIModelDBModel } from "../../../../../../types/entities/openAIModel.js";

export const openAIModelModelDefinition: MongooseModelDefinition<"openAIModels", "OpenAIModel", MongoStored<OpenAIModelDBModel>> = Object.freeze({
    model: "OpenAIModel",
    collection: "openAIModels",
    createModel: con => con.models[openAIModelModelDefinition.model] || con.model(openAIModelModelDefinition.model, schema)
});

const schema = new mongoose.Schema<MongoStored<OpenAIModelDBModel>>({
    insertDate: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false
    },
    name: {
        type: String,
        required: true,
        unique: true,
        maxlength: 40
    },
    title: {
        type: String,
        required: true,
        maxlength: 50
    },
    type: {
        type: Number,
        enum: OpenAIModelType,
        required: true,
        default: OpenAIModelType.Text
    },
    pricePmu: {
        inputText: {
            type: Number,
            required: true,
            min: 0,
        },
        outputText: {
            type: Number,
            required: true,
            min: 0,
        },
        inputAudio: {
            type: Number,
            required: true,
            min: 0,
        },
        outputAudio: {
            type: Number,
            required: true,
            min: 0,
        },
    },
}, { versionKey: false, collection: openAIModelModelDefinition.collection });
