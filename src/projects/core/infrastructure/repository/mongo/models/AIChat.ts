import mongoose from "mongoose";
import type { userModelDefinition } from "./User.js";
import { aiModelModelDefinition } from "./AIModel.js";
import type { AIChatDBModel } from "../../../../../../types/entities/aiChat.js";
import { AIChatBehavior } from "../../../../../../types/enums/aiChatBehavior.js";
import type { FlattenToObjectIDs, MongooseModelDefinition, MongoStored } from "../lib/model.type.js";

type AIChatMongoStored = MongoStored<FlattenToObjectIDs<AIChatDBModel, 'user' | 'model'>>;

export const aiChatModelDefinition: MongooseModelDefinition<"aiChats", "AIChat", AIChatMongoStored> = Object.freeze({
    model: "AIChat",
    collection: "aiChats",
    createModel: con => con.models[aiChatModelDefinition.model] || con.model(aiChatModelDefinition.model, schema)
});

const schema = new mongoose.Schema<AIChatMongoStored>({
    insertDate: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false
    },
    title: {
        type: String,
        required: function () { // required but allow empty string
            return typeof this.title === "string" ? false : true
        }
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User" satisfies typeof userModelDefinition['model'],
        required: true
    },
    model: {
        type: mongoose.Types.ObjectId,
        ref: aiModelModelDefinition.model,
        required: true
    },
    isHidden: {
        type: Boolean,
        required: true,
        default: false
    },
    behavior: {
        type: Number,
        required: true,
        enum: AIChatBehavior,
        default: AIChatBehavior.None
    },
}, { versionKey: false, collection: aiChatModelDefinition.collection });
