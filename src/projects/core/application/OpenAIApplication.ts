import type { ServicesType } from "../Container.js";
import type { User } from "../../../types/entities/user.js";
import { OperationResult } from "../common/dto/OperationResult.js";

export default class OpenAIApplication {
    #openAI;
    #openAIMessageRepository;
    #userSubscriptionRepository;

    constructor(container: ServicesType) {
        this.#openAI = container.openAI;
        this.#openAIMessageRepository = container.openAIMessageRepository;
        this.#userSubscriptionRepository = container.userSubscriptionRepository;
    }

    async textMessage(user: User, message: string) {
        // const result = new OperationResult();

        var start = new Date();
        start.setUTCHours(0, 0, 0, 0);

        var end = new Date();
        end.setUTCHours(23, 59, 59, 999);

        const freePointUsage = await this.#openAIMessageRepository.getFreePointUsage(user.id, start, end);

        if (freePointUsage === null)
            return;

        if (freePointUsage < 200) {
            const res = await this.#openAI.simpleMessage(message, user.id);

            return `Free usage: ${freePointUsage}\n\n${res}`;
        }

        const subscription = await this.#userSubscriptionRepository.getActive(user.id, new Date());

        if (!subscription)
            return;

        const currentPlanUsage = await this.#openAIMessageRepository.getPlanPointUsage(subscription.plan.id);

        if (currentPlanUsage === null)
            return;

        // await this.#openAIMessageRepository.create

        const res = await this.#openAI.simpleMessage(message, user.id);

        return `Plan usage: ${currentPlanUsage}\n\n${res}`;

        // return result;
    }
}