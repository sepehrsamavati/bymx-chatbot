import type { PaymentServicesType } from "../Container.js";

export default class PaymentLinkApplication {
    #paymentLinkRepository;

    constructor(services: PaymentServicesType) {
        this.#paymentLinkRepository = services.paymentLinkRepository;
    }

    async getLinkByProductId(productId: string) {
        return await this.#paymentLinkRepository.getOne({ productId });
    }
}
