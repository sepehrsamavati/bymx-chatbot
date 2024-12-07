import type { CreatePayment, Payment, SearchPayment, UpdatePayment } from "../entities/payment";

export type IPaymentRepository = {
    create(payment: CreatePayment): Promise<boolean | null>;
    update(payment: UpdatePayment): Promise<boolean | null>;
    getMany(filter: SearchPayment): Promise<Payment[] | null>;
}
