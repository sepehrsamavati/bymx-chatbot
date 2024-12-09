import mongoose from "mongoose";
import type { PaymentLink } from "../../../../types/entities/paymentLink.js";
import type { MongooseModelDefinition, MongoStored } from "../../../../../core/infrastructure/repository/mongo/lib/model.type.js";

type PaymentLinkMongoStored = MongoStored<PaymentLink>;

export const paymentLinkModelDefinition: MongooseModelDefinition<"staticPaymentLinks", "StaticPaymentLink", PaymentLinkMongoStored> = Object.freeze({
    model: "StaticPaymentLink",
    collection: "staticPaymentLinks",
    createModel: con => con.models[paymentLinkModelDefinition.model] || con.model(paymentLinkModelDefinition.model, schema)
});

const schema = new mongoose.Schema<PaymentLinkMongoStored>({
    url: {
        type: String,
        required: true,
        index: true,
    },
    productId: {
        type: String,
        required: true,
        index: true,
    },
}, { versionKey: false, collection: paymentLinkModelDefinition.collection });
