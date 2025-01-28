import type { FilterQuery } from "mongoose";
import type { PaymentServicesType } from "../../../Container.js";
import { errorLogger } from "../../../../../../helpers/logger.js";
import type { IPaymentLinkRepository } from "../../../types/contracts/repositories.js";
import type { PaymentLink, SearchPaymentLink } from "../../../types/entities/paymentLink.js";

export class PaymentLinkRepository implements IPaymentLinkRepository {
    #databaseConnection;
    constructor(container: PaymentServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async getOne(filter: SearchPaymentLink): Promise<PaymentLink | null> {
        try {
            const _filter: FilterQuery<PaymentLink> = {};

            if (filter.productId !== undefined)
                _filter.productId = filter.productId;

            if (filter.url !== undefined)
                _filter.url = filter.url;

            const res = await this.#databaseConnection.models.paymentLink
                .findOne(_filter)
                .lean()
                .exec();

            if (!res)
                return null;

            return {
                url: res.url,
                productId: res.productId,
            };
        } catch (err) {
            errorLogger("PaymentLinkRepository / getOne", err);
            return null;
        }
    }
}