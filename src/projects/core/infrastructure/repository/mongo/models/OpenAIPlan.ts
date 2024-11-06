import mongoose from "mongoose";
import type { MongooseModelDefinition, MongoStored } from "../lib/model.type.js";
import type { OpenAIPlanDBModel } from "../../../../../../types/entities/openAIPlan.js";

export const openAIPlanModelDefinition: MongooseModelDefinition<"openAIPlans", "OpenAIPlan", MongoStored<OpenAIPlanDBModel>> = Object.freeze({
    model: "OpenAIPlan",
    collection: "openAIPlans",
    createModel: con => con.models[openAIPlanModelDefinition.model] || con.model(openAIPlanModelDefinition.model, schema)
});

const schema = new mongoose.Schema<MongoStored<OpenAIPlanDBModel>>({
    insertDate: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false
    },
    available: {
        type: Boolean,
        required: true,
    },
    title: {
        type: String,
        required: true,
        maxlength: 50
    },
    days: {
        type: Number,
        required: true,
        min: 0,
    },
    points: {
        type: Number,
        required: true,
        min: 0,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
}, { versionKey: false, collection: openAIPlanModelDefinition.collection });
