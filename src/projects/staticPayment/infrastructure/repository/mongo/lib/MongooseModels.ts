import type mongoose from "mongoose";
import { paymentModelDefinition } from "../models/Payment.js";
import { paymentLinkModelDefinition } from "../models/PaymentLink.js";

export default class MongooseModels {
    readonly models;

    constructor(private connection: mongoose.Connection) {
        this.models = Object.freeze({
            payment: paymentModelDefinition.createModel(this.connection),
            paymentLink: paymentLinkModelDefinition.createModel(this.connection),
        });
    }
}
