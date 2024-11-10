import mongoose from "mongoose";
import { userModelDefinition } from "./User.js";
import { openAIModelModelDefinition } from "./OpenAIModel.js";
import type { OpenAIChatDBModel } from "../../../../../../types/entities/openAIChat.js";
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
    user: {
        type: mongoose.Types.ObjectId,
        ref: userModelDefinition.model,
        required: true
    },
    model: {
        type: mongoose.Types.ObjectId,
        ref: openAIModelModelDefinition.model,
        required: true
    },
}, { versionKey: false, collection: openAIChatModelDefinition.collection });
