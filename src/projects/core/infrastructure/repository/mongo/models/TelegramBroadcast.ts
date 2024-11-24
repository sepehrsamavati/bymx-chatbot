import mongoose from "mongoose";
import { userModelDefinition } from "./User.js";
import type { TelegramBroadcastDBModel } from "../../../../../../types/entities/telegramBroadcast.js";
import type { FlattenToObjectIDs, MongooseModelDefinition, MongoStored } from "../lib/model.type.js";

type TelegramBroadcastMongoStored = MongoStored<FlattenToObjectIDs<TelegramBroadcastDBModel, 'admin'>>;

export const telegramBroadcastModelDefinition: MongooseModelDefinition<"telegramBroadcasts", "TelegramBroadcast", TelegramBroadcastMongoStored> = Object.freeze({
    model: "TelegramBroadcast",
    collection: "telegramBroadcasts",
    createModel: con => con.models[telegramBroadcastModelDefinition.model] || con.model(telegramBroadcastModelDefinition.model, schema)
});

const schema = new mongoose.Schema<TelegramBroadcastMongoStored>({
    insertDate: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false
    },
    admin: {
        type: mongoose.Types.ObjectId,
        ref: userModelDefinition.model,
        required: true
    },
    pendingTgIds: {
        type: [Number],
        required: true
    },
    startDate: {
        type: Date,
        required: false,
    },
    endDate: {
        type: Date,
        required: false,
    },
    okCount: {
        type: Number,
        required: true
    },
    messageId: {
        type: Number,
        required: true
    },
}, { versionKey: false, collection: telegramBroadcastModelDefinition.collection });
