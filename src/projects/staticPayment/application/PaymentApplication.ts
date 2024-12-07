import type { PaymentServicesType } from "../Container.js";
import type { Payment } from "../types/entities/payment.js";
import { PaymentStatus } from "../types/enums/paymentStatus.js";
import { OperationResult, OperationResultWithData } from "../../core/common/dto/OperationResult.js";

export default class PaymentApplication {
    #lock;
    #paymentRepository;

    constructor(services: PaymentServicesType) {
        this.#lock = services.paymentLockCache;
        this.#paymentRepository = services.paymentRepository;
    }

    async #getUserOpenPayment(userId: string) {
        const result = new OperationResultWithData<Payment>();

        const userOpenPayments = await this.#paymentRepository.getMany({ userId, status: PaymentStatus.Open });

        if (userOpenPayments?.length === 1) {
            const payment = userOpenPayments[0];
            result.succeeded().setData(payment);
        }

        return result;
    }

    async #changeUserOpenPaymentStatus(userId: string, status: PaymentStatus) {
        const result = new OperationResult();

        if (this.#lock.isLocked(userId))
            return result.failed();

        this.#lock.lock(userId);

        const openPayment = await this.#getUserOpenPayment(userId);

        if (openPayment.ok) {
            if (await this.#paymentRepository.update({
                id: openPayment.data.id,
                status: status,
            }))
                result.succeeded();
        }

        this.#lock.unlock(userId);
        return result;
    }

    async open(userId: string) {
        const result = new OperationResult();

        if (this.#lock.isLocked(userId))
            return result.failed();

        this.#lock.lock(userId);

        if (await this.#paymentRepository.create({
            date: new Date(),
            status: PaymentStatus.Open,
            userId: userId,
        }))
            result.succeeded();

        this.#lock.unlock(userId);
        return result;
    }

    async approveByUser(userId: string) {
        return await this.#changeUserOpenPaymentStatus(userId, PaymentStatus.PendingApprove);
    }

    async approveByAdmin(userId: string) {
        return await this.#changeUserOpenPaymentStatus(userId, PaymentStatus.Approved);
    }

    async rejectByAdmin(userId: string) {
        return await this.#changeUserOpenPaymentStatus(userId, PaymentStatus.Rejected);
    }

    async cancel(userId: string) {
        return await this.#changeUserOpenPaymentStatus(userId, PaymentStatus.Canceled);
    }
}
