import type { PaymentServicesType } from "../../../Container.js";
import { errorLogger } from "../../../../core/helpers/logger.js";
import type { IPaymentRepository } from "../../../types/contracts/repositories.js";
import type { CreatePayment, Payment, SearchPayment, UpdatePayment } from "../../../types/entities/payment.js";
import { FilterQuery } from "mongoose";

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
            const res = await this.#databaseConnection.models.payment
                .updateOne({
                    _id: payment.id,
                }, {
                    status: payment.status,
                });
            return Boolean(res.matchedCount === 1);
        } catch (err) {
            errorLogger("PaymentRepository / update", err);
            return null;
        }
    }

    async getMany(filter: SearchPayment): Promise<Payment[] | null> {
        try {
            const _filter: FilterQuery<Payment> = {};

            if (filter.paymentId !== undefined)
                _filter.paymentId = filter.paymentId;

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
                paymentId: item.paymentId,
                status: item.status,
                userId: item.userId,
            }));
        } catch (err) {
            errorLogger("PaymentRepository / getMany", err);
            return null;
        }
    }
}