import mongoose from "mongoose";
import type { Payment } from "../../../../types/entities/payment.js";
import { PaymentStatus } from "../../../../types/enums/paymentStatus.js";
import type { MongooseModelDefinition, MongoStored } from "../../../../../core/infrastructure/repository/mongo/lib/model.type.js";

type PaymentMongoStored = MongoStored<Payment>;

export const paymentModelDefinition: MongooseModelDefinition<"staticPayments", "StaticPayment", PaymentMongoStored> = Object.freeze({
    model: "StaticPayment",
    collection: "staticPayments",
    createModel: con => con.models[paymentModelDefinition.model] || con.model(paymentModelDefinition.model, schema)
});

const schema = new mongoose.Schema<PaymentMongoStored>({
    date: {
        type: Date,
        required: true,
    },
    status: {
        type: Number,
        required: true,
        enum: PaymentStatus,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    gatewayPaymentId: {
        type: String,
        required: false,
        index: true,
    },
}, { versionKey: false, collection: paymentModelDefinition.collection });
