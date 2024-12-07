import type { PaymentStatus } from "../enums/paymentStatus";

export type Payment = {
    id: string;
    date: Date;
    userId: string;
    paymentId?: string;
    status: PaymentStatus;
}

export type CreatePayment = Omit<Payment, 'id'>;
export type UpdatePayment = { id: string } & Pick<Payment, 'status'>;
export type SearchPayment = Pick<Partial<Payment>, 'userId' | 'paymentId' | 'status'>;
