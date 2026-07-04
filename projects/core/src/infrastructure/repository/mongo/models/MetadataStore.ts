import mongoose from "mongoose";
import type { MongooseModelDefinition, MongoStored } from "../lib/model.type.js";
import type { MetadataStoreDbModel } from "../../../../types/entities/metadataStore.js";

export const metadataStoreModelDefinition: MongooseModelDefinition<"metadataStore", "MetadataStore", MongoStored<MetadataStoreDbModel>> = Object.freeze({
    model: "MetadataStore",
    collection: "metadataStore",
    createModel: con => con.models[metadataStoreModelDefinition.model] || con.model(metadataStoreModelDefinition.model, schema)
});

type MetadataStoreMongoStored = MongoStored<MetadataStoreDbModel>;

const schema = new mongoose.Schema<MetadataStoreMongoStored>({
    insertDate: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false
    },
    scope: {
        type: String,
        required: true,
        index: true,
    },
    key: {
        type: String,
        index: true,
        required: function (this: MetadataStoreMongoStored): boolean { // required but allow empty string
            return typeof this.key === "string" ? false : true
        },
    },
    value: {
        type: String,
        required: function (this: MetadataStoreMongoStored): boolean {
            return typeof this.key === "string" ? false : true
        },
    },
}, { versionKey: false, collection: metadataStoreModelDefinition.collection });
