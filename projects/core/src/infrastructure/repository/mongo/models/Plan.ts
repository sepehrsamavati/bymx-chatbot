import mongoose from "mongoose";
import { PlanType } from "../../../../types/enums/planTypes.js";
import type { PlanDBModel } from "../../../../types/entities/plan.js";
import type { MongooseModelDefinition, MongoStored } from "../lib/model.type.js";

export const planModelDefinition: MongooseModelDefinition<"plans", "Plan", MongoStored<PlanDBModel>> = Object.freeze({
    model: "Plan",
    collection: "plans",
    createModel: con => con.models[planModelDefinition.model] || con.model(planModelDefinition.model, schema)
});

const schema = new mongoose.Schema<MongoStored<PlanDBModel>>({
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
    type: {
        type: Number,
        required: true,
        enum: PlanType
    },
}, { versionKey: false, collection: planModelDefinition.collection });
