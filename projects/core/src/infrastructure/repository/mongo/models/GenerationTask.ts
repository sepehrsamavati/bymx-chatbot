import mongoose from "mongoose";
import { userModelDefinition } from "./User.js";
import { aiChatModelDefinition } from "./AIChat.js";
import type { MongooseModelDefinition, MongoStored } from "../lib/model.type.js";
import { userSubscriptionUsageModelDefinition } from "./UserSubscriptionUsage.js";
import { GenerationTaskType } from "../../../../types/enums/generationTaskType.js";
import { GenerationTaskStatus } from "../../../../types/enums/generationTaskStatus.js";
import type { GenerationTaskDBModel } from "../../../../types/entities/generationTask.js";

export const generationTaskModelDefinition: MongooseModelDefinition<"generationTasks", "GenerationTask", MongoStored<GenerationTaskDBModel>> = Object.freeze({
    model: "GenerationTask",
    collection: "generationTasks",
    createModel: con => con.models[generationTaskModelDefinition.model] || con.model(generationTaskModelDefinition.model, schema)
});

const schema = new mongoose.Schema<MongoStored<GenerationTaskDBModel>>({
    insertDate: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false
    },
    expiry: {
        type: Date,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    internalId: {
        type: String,
        required: true,
        unique: true,
    },
    externalId: {
        type: String,
        required: true,
        index: true,
    },
    type: {
        type: Number,
        enum: GenerationTaskType,
        required: true,
    },
    status: {
        type: Number,
        enum: GenerationTaskStatus,
        required: true,
    },
    result: {
        type: mongoose.SchemaTypes.Mixed,
    },
    usages: {
        type: [mongoose.Types.ObjectId],
        ref: userSubscriptionUsageModelDefinition.model,
        required: true
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: userModelDefinition.model,
        required: true
    },
    model: {
        type: mongoose.Types.ObjectId,
        ref: "AIModel",
        required: true
    },
    promptInfo: {
        type: {
            input: String,
            cost: Number,
            points: Number,
            chat: {
                type: mongoose.Types.ObjectId,
                ref: aiChatModelDefinition.model,
                required: false,
            },
            saved: Boolean,
            fileId: String,
        },
        required: false,
    }
}, { versionKey: false, collection: generationTaskModelDefinition.collection });
