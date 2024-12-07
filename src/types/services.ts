import type CoreServices from "../projects/core/Container";
import type PaymentServices from "../projects/staticPayment/Container";

export type IServices = {
    core: CoreServices;
    payment: PaymentServices;
};