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
        } else if (userOpenPayments?.length === 0) {
            result.failed("itemNotFound");
        }

        return result;
    }

    async #changeUserOpenPaymentStatus(userId: string, status: PaymentStatus) {
        const result = new OperationResultWithData<Payment>();

        if (this.#lock.isLocked(userId))
            return result.failed();

        this.#lock.lock(userId);

        const openPayment = await this.#getUserOpenPayment(userId);

        if (openPayment.ok) {
            if (await this.#paymentRepository.update({
                id: openPayment.data.id,
                status: status,
            }))
                result.succeeded().setData(openPayment.data);
        } else {
            result.failed(openPayment.message);
        }

        this.#lock.unlock(userId);
        return result;
    }

    async #changePaymentStatus(paymentId: string, status: PaymentStatus) {
        const result = new OperationResult();

        const updated = await this.#paymentRepository.update({
            id: paymentId,
            status: status
        });

        if (updated)
            result.succeeded();

        return result;
    }

    async open(userId: string) {
        const result = new OperationResult();

        if (this.#lock.isLocked(userId))
            return result.failed();

        this.#lock.lock(userId);

        const hasOpenPayment = await this.#getUserOpenPayment(userId);

        if (hasOpenPayment.ok) {
            result.failed("anOpenPaymentExists");
        } else if (await this.#paymentRepository.create({
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

    async approveById(paymentId: string) {
        return await this.#changePaymentStatus(paymentId, PaymentStatus.Approved);
    }

    async rejectById(paymentId: string) {
        return await this.#changePaymentStatus(paymentId, PaymentStatus.Rejected);
    }

    async cancel(userId: string) {
        return await this.#changeUserOpenPaymentStatus(userId, PaymentStatus.Canceled);
    }

    async setGatewayPaymentId(paymentId: string, gatewayPaymentId: string) {
        const result = new OperationResult();
        const payment = await this.#paymentRepository.getOne({ id: paymentId });

        if (!payment)
            result.failed("itemNotFound");
        else if (payment?.gatewayPaymentId)
            result.failed("paymentIdAlreadySet");
        else if (await this.#paymentRepository.update({ id: payment.id, gatewayPaymentId }))
            result.succeeded();

        return result;
    }

    async getById(paymentId: string) {
        const payment = await this.#paymentRepository.getOne({
            id: paymentId
        });
        return payment;
    }
}
