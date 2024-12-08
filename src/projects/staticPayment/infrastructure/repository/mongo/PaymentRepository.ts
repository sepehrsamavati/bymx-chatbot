import type { FilterQuery, UpdateQuery } from "mongoose";
import type { PaymentServicesType } from "../../../Container.js";
import { errorLogger } from "../../../../core/helpers/logger.js";
import type { IPaymentRepository } from "../../../types/contracts/repositories.js";
import type { CreatePayment, Payment, SearchPayment, UpdatePayment } from "../../../types/entities/payment.js";

export class PaymentRepository implements IPaymentRepository {
    #databaseConnection;
    constructor(container: PaymentServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(payment: CreatePayment): Promise<boolean | null> {
        try {
            const res = await this.#databaseConnection.models.payment.create(payment);
            return Boolean(res._id);
        } catch (err) {
            errorLogger("PaymentRepository / create", err);
            return null;
        }
    }

    async update(payment: UpdatePayment): Promise<boolean | null> {
        try {
            const _update: UpdateQuery<Payment> = {};

            if (payment.status)
                _update.status = payment.status;

            if (payment.gatewayPaymentId)
                _update.gatewayPaymentId = payment.gatewayPaymentId;

            if (payment.rejectReason)
                _update.rejectReason = payment.rejectReason;

            const res = await this.#databaseConnection.models.payment
                .updateOne({
                    _id: payment.id,
                }, _update);
            return Boolean(res.matchedCount === 1);
        } catch (err) {
            errorLogger("PaymentRepository / update", err);
            return null;
        }
    }

    async getOne(filter: SearchPayment): Promise<Payment | null> {
        try {
            const _filter: FilterQuery<Payment> = {};

            if (filter.id !== undefined)
                _filter._id = filter.id;

            if (filter.gatewayPaymentId !== undefined)
                _filter.gatewayPaymentId = filter.gatewayPaymentId;

            if (filter.status !== undefined)
                _filter.status = filter.status;

            if (filter.userId !== undefined)
                _filter.userId = filter.userId;

            const res = await this.#databaseConnection.models.payment
                .findOne(_filter)
                .lean()
                .exec();

            if (!res)
                return null;

            const item = res;

            return {
                id: item._id.toString(),
                date: item.date,
                gatewayPaymentId: item.gatewayPaymentId,
                status: item.status,
                userId: item.userId,
                rejectReason: item.rejectReason,
                productId: item.productId,
            };
        } catch (err) {
            errorLogger("PaymentRepository / getOne", err);
            return null;
        }
    }

    async getMany(filter: SearchPayment): Promise<Payment[] | null> {
        try {
            const _filter: FilterQuery<Payment> = {};

            if (filter.id !== undefined)
                _filter._id = filter.id;

            if (filter.gatewayPaymentId !== undefined)
                _filter.gatewayPaymentId = filter.gatewayPaymentId;

            if (filter.status !== undefined)
                _filter.status = filter.status;

            if (filter.userId !== undefined)
                _filter.userId = filter.userId;

            const res = await this.#databaseConnection.models.payment
                .find(_filter)
                .lean()
                .exec();

            if (!res)
                return null;

            return res.map(item => ({
                id: item._id.toString(),
                date: item.date,
                paymentId: item.gatewayPaymentId,
                status: item.status,
                userId: item.userId,
                rejectReason: item.rejectReason,
                productId: item.productId,
                gatewayPaymentId: item.gatewayPaymentId,
            }));
        } catch (err) {
            errorLogger("PaymentRepository / getMany", err);
            return null;
        }
    }
}