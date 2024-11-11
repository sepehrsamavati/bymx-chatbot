import type { ServicesType } from "../Container.js";
import type { User } from "../../../types/entities/user.js";
import { OperationResult } from "../common/dto/OperationResult.js";
import type { OpenAIChat } from "../../../types/entities/openAIChat.js";
import { modelCostCalculator } from "../helpers/openAICostCalculator.js";

export default class OpenAIApplication {
    #openAI;
    #openAIChatRepository;
    #openAIMessageRepository;
    #userSubscriptionRepository;
    #userRepository;
    #openAIModelCache;

    constructor(container: ServicesType) {
        this.#openAI = container.openAI;
        this.#openAIChatRepository = container.openAIChatRepository;
        this.#openAIMessageRepository = container.openAIMessageRepository;
        this.#userSubscriptionRepository = container.userSubscriptionRepository;
        this.#userRepository = container.userRepository;
        this.#openAIModelCache = container.openAIModelCache;
    }

    async textMessage(user: User, message: string) {
        // const result = new OperationResult();

        let selectedChat = user.selectedChat;

        if (!selectedChat) {
            const hasChats = await this.#openAIChatRepository.exists(user.id);

            if (hasChats === null)
                return; // error

            if (hasChats)
                return; // select chat

            const defaultModel = await this.#openAIModelCache.getDefault();
            const defaultChatId = await this.#openAIChatRepository.create({
                insertDate: new Date(),
                isDeleted: false,
                title: "Default",
                user: user,
                model: defaultModel,
            });

            if (defaultChatId === null)
                return; // error

            const openAIChat: OpenAIChat = {
                id: defaultChatId,
                title: "Default",
                user: user,
                model: defaultModel,
            };

            const updateResult = await this.#userRepository.update(user.id, {
                selectedChat: openAIChat
            });

            if (updateResult?.ok) {
                selectedChat = user.selectedChat = openAIChat;
            } else {
                return; // error
            }
        }

        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date();
        end.setUTCHours(23, 59, 59, 999);

        const freePointUsage = await this.#openAIMessageRepository.getFreePointUsage(user.id, start, end);

        if (freePointUsage === null)
            return;

        if (freePointUsage < 200) {
            const res = await this.#openAI.simpleMessage(message, user.id);

            if (res) {
                const { cost, userPointCost } = modelCostCalculator({
                    model: selectedChat.model,
                    profitPercentage: 20,
                    tokenCount: 400
                });

                await this.#openAIMessageRepository.create({
                    chat: selectedChat,
                    cost: cost,
                    insertDate: new Date(),
                    isDeleted: false,
                    output: res,
                    prompt: message,
                    points: userPointCost,
                    saved: false,
                    // plan: subscription.plan
                });
            }

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