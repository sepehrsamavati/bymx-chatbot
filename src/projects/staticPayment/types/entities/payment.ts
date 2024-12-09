import type { PaymentStatus } from "../enums/paymentStatus";

export type Payment = {
    id: string;
    date: Date;
    userId: string;
    gatewayPaymentId?: string;
    rejectReason?: string;
    approvedByUser?: string;
    status: PaymentStatus;
    productId: string;
}

export type CreatePayment = Omit<Payment, 'id'>;
export type UpdatePayment = { id: string } & Pick<Partial<Payment>, 'status' | 'gatewayPaymentId' | 'rejectReason' | 'approvedByUser'>;
export type SearchPayment = { id?: string } & Pick<Partial<Payment>, 'userId' | 'gatewayPaymentId' | 'status'>;
