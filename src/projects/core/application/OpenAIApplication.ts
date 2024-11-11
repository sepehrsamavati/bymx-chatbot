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

    async getFreePointStatus(userId: string) {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date();
        end.setUTCHours(23, 59, 59, 999);

        const freePointUsage = await this.#openAIMessageRepository.getFreePointUsage(userId, start, end);


        if (freePointUsage === null)
            return null;

        return {
            used: freePointUsage,
            remaining: freePointUsage < 200 ? 200 - freePointUsage : 0,
            total: 200
        };
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

            const openAIChat = {
                title: "Default",
                user: user,
                model: defaultModel,
                isHidden: true
            } satisfies Partial<OpenAIChat>;

            const defaultChatId = await this.#openAIChatRepository.create({
                insertDate: new Date(),
                isDeleted: false,
                title: "Default",
                user: user,
                model: defaultModel,
                isHidden: true
            });

            if (defaultChatId === null)
                return; // error

            const updateResult = await this.#userRepository.update(user.id, {
                selectedChat: {
                    ...openAIChat,
                    id: defaultChatId
                }
            });

            if (updateResult?.ok) {
                selectedChat = user.selectedChat = {
                    ...openAIChat,
                    id: defaultChatId
                };
            } else {
                return; // error
            }
        }

        const freePointUsage = await this.getFreePointStatus(user.id);

        if (freePointUsage === null)
            return;

        if (freePointUsage.remaining > 0) {
            const res = await this.#openAI.simpleMessage(message, selectedChat.model.name, user.id);

            if (res) {
                const tokenCount = res.totalTokens ?? (
                    message + " " + res.output
                ).split(' ').length;

                const { cost, userPointCost } = modelCostCalculator({
                    model: selectedChat.model,
                    profitPercentage: 20,
                    tokenCount: tokenCount
                });

                await this.#openAIMessageRepository.create({
                    chat: selectedChat,
                    cost: cost,
                    insertDate: new Date(),
                    isDeleted: false,
                    output: res.output,
                    prompt: message,
                    points: userPointCost,
                    saved: !selectedChat.isHidden && user.saveMessages,
                    // plan: subscription.plan
                });
            }

            return res?.output;
        }

        const subscription = await this.#userSubscriptionRepository.getActive(user.id, new Date());

        if (!subscription)
            return;

        const currentPlanUsage = await this.#openAIMessageRepository.getPlanPointUsage(subscription.plan.id);

        if (currentPlanUsage === null)
            return;

        // await this.#openAIMessageRepository.create

        const res = await this.#openAI.simpleMessage(message, selectedChat.model.name, user.id);

        return `Plan usage: ${currentPlanUsage}\n\n${res?.output}`;

        // return result;
    }
}