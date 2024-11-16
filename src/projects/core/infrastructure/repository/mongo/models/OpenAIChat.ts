import mongoose from "mongoose";
import type { userModelDefinition } from "./User.js";
import { openAIModelModelDefinition } from "./OpenAIModel.js";
import type { OpenAIChatDBModel } from "../../../../../../types/entities/openAIChat.js";
import { OpenAISystemMessage } from "../../../../../../types/enums/openAISystemMessages.js";
import type { FlattenToObjectIDs, MongooseModelDefinition, MongoStored } from "../lib/model.type.js";

type OpenAIChatMongoStored = MongoStored<FlattenToObjectIDs<OpenAIChatDBModel, 'user' | 'model'>>;

export const openAIChatModelDefinition: MongooseModelDefinition<"openAIChats", "OpenAIChat", OpenAIChatMongoStored> = Object.freeze({
    model: "OpenAIChat",
    collection: "openAIChats",
    createModel: con => con.models[openAIChatModelDefinition.model] || con.model(openAIChatModelDefinition.model, schema)
});

const schema = new mongoose.Schema<OpenAIChatMongoStored>({
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
        ref: openAIModelModelDefinition.model,
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
        enum: OpenAISystemMessage,
        default: OpenAISystemMessage.None
    },
}, { versionKey: false, collection: openAIChatModelDefinition.collection });
