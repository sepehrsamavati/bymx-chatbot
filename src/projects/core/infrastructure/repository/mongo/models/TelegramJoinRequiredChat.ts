import mongoose from "mongoose";
import type { MongooseModelDefinition, MongoStored } from "../lib/model.type.js";
import type { TelegramJoinRequiredChatDBModel } from "../../../../../../types/entities/telegramJoinRequiredChat.js";

type TelegramJoinRequiredChatMongoStored = MongoStored<TelegramJoinRequiredChatDBModel>;

export const telegramJoinRequiredChatModelDefinition: MongooseModelDefinition<"telegramJoinRequiredChats", "TelegramJoinRequiredChat", TelegramJoinRequiredChatMongoStored> = Object.freeze({
    model: "TelegramJoinRequiredChat",
    collection: "telegramJoinRequiredChats",
    createModel: con => con.models[telegramJoinRequiredChatModelDefinition.model] || con.model(telegramJoinRequiredChatModelDefinition.model, schema)
});

const schema = new mongoose.Schema<TelegramJoinRequiredChatMongoStored>({
    insertDate: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true
    },
    chatId: {
        type: Number,
        required: true
    },
    link: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
}, { versionKey: false, collection: telegramJoinRequiredChatModelDefinition.collection });
