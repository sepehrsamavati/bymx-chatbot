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

        // const subscription = await this.#userSubscriptionRepository.getActive(user.id, new Date());

        // if(!subscription)
        //     return;

        // const usage = this.#openAIMessageRepository.getUserPointUsage(user.id,);

        return await this.#openAI.simpleMessage(message, user.id);

        // return result;
    }
}