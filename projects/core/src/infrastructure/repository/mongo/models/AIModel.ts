import mongoose from "mongoose";
import { AIModelType } from "../../../../types/enums/aiModelType.js";
import type { MongooseModelDefinition, MongoStored } from "../lib/model.type.js";
import type { AIModelDBModel } from "../../../../types/entities/aiModel.js";
import { AIModelProvider } from "../../../../types/enums/aiModelProvider.js";

export const aiModelModelDefinition: MongooseModelDefinition<"aiModels", "AIModel", MongoStored<AIModelDBModel>> = Object.freeze({
    model: "AIModel",
    collection: "aiModels",
    createModel: con => con.models[aiModelModelDefinition.model] || con.model(aiModelModelDefinition.model, schema)
});

const schema = new mongoose.Schema<MongoStored<AIModelDBModel>>({
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
        enum: AIModelType,
        required: true,
        default: AIModelType.Text
    },
    provider: {
        type: Number,
        enum: AIModelProvider,
        required: true,
    },
    assistants: {
        type: {
            fileSearch: {
                type: String,
                required: false
            }
        },
        required: true
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
        inputImage: {
            type: Number,
            required: true,
            min: 0,
        },
        outputImage: {
            type: Number,
            required: true,
            min: 0,
        },
    },
}, { versionKey: false, collection: aiModelModelDefinition.collection });
