import mongoose from "mongoose";
import { userModelDefinition } from "./User.js";
import type { UserTempFileDBModel } from "../../../../../../types/entities/userTempFile.js";
import type { FlattenToObjectIDs, MongooseModelDefinition, MongoStored } from "../lib/model.type.js";

type UserTempFileMongoStored = MongoStored<FlattenToObjectIDs<UserTempFileDBModel, 'user'>>;

export const userTempFileModelDefinition: MongooseModelDefinition<"userTempFiles", "UserTempFile", UserTempFileMongoStored> = Object.freeze({
    model: "UserTempFile",
    collection: "userTempFiles",
    createModel: con => con.models[userTempFileModelDefinition.model] || con.model(userTempFileModelDefinition.model, schema)
});

const schema = new mongoose.Schema<UserTempFileMongoStored>({
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
        required: true,
    },
    extension: {
        type: String,
        required: true,
        maxlength: 10
    },
    fsId: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
        min: 0,
    },
    tgId: {
        type: String,
        required: true,
    },
    tgUniqueId: {
        type: String,
        required: true
    },
    openAiFileId: {
        type: String,
        required: false
    },
    vectorIds: {
        type: [{
            type: String,
            required: false
        }],
        required: true,
        default: []
    },
    lastAccessed: {
        type: Date,
        required: true
    }
}, { versionKey: false, collection: userTempFileModelDefinition.collection });
