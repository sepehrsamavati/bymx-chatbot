import type CoreServices from "../Container.js";
import type PaymentServices from "../infrastructure/services/staticPayment/Container.js";

export type IServices = {
    core: CoreServices;
    payment: PaymentServices;
};