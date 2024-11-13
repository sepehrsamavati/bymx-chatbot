import config from "../config.js";
import type { ServicesType } from "../Container.js";
import type { User } from "../../../types/entities/user.js";
import type { OpenAIChat } from "../../../types/entities/openAIChat.js";
import { modelCostCalculator } from "../helpers/openAICostCalculator.js";
import { OperationResultWithData } from "../common/dto/OperationResult.js";
import type { OpenAIMessage } from "../../../types/entities/openAIMessage.js";
import type { UserSubscription } from "../../../types/entities/userSubscription.js";

export default class OpenAIApplication {
    #openAI;
    #openAIChatRepository;
    #openAIMessageRepository;
    #userSubscriptionRepository;
    #userRepository;
    #openAIModelCache;
    #messageLock;

    constructor(container: ServicesType) {
        this.#openAI = container.openAI;
        this.#openAIChatRepository = container.openAIChatRepository;
        this.#openAIMessageRepository = container.openAIMessageRepository;
        this.#userSubscriptionRepository = container.userSubscriptionRepository;
        this.#userRepository = container.userRepository;
        this.#openAIModelCache = container.openAIModelCache;
        this.#messageLock = container.openAIMessageLockCache;
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

    async #textMessage(user: User, message: string): Promise<OperationResultWithData<string>> {
        const result = new OperationResultWithData<string>().failed("errorOccurred");

        let selectedChat = user.selectedChat;

        if (!selectedChat) {
            const hasChats = await this.#openAIChatRepository.exists(user.id);

            if (hasChats === null)
                return result.failed(); // error

            if (hasChats)
                return result.failed("selectChatBeforeUse"); // select chat

            const defaultModel = await this.#openAIModelCache.getDefault();

            const openAIChat = {
                title: "",
                user: user,
                model: defaultModel,
                isHidden: true
            } satisfies Partial<OpenAIChat>;

            const defaultChatId = await this.#openAIChatRepository.create({
                insertDate: new Date(),
                isDeleted: false,
                title: "",
                user: user,
                model: defaultModel,
                isHidden: true
            });

            if (defaultChatId === null)
                return result.failed(); // error

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
                return result.failed(); // error
            }
        }

        const freePointUsage = await this.getFreePointStatus(user.id);

        if (freePointUsage === null)
            return result.failed();

        let historyMessages: OpenAIMessage[] = [];

        if (user.memoryAmount && user.saveMessages) {
            const _historyMessages = await this.#openAIMessageRepository.getRecentHistory(selectedChat.id, user.memoryAmount);

            if (_historyMessages === null)
                return result.failed();

            historyMessages = _historyMessages;
        }

        let subscription: Omit<UserSubscription, 'user'> | null = null;
        let currentPlanUsage = 0;

        if (freePointUsage.remaining <= 0) {
            subscription = await this.#userSubscriptionRepository.getActive(user.id, new Date());

            if (!subscription)
                return result.failed("noActiveSubscription");

            const _currentPlanUsage = await this.#openAIMessageRepository.getPlanPointUsage(subscription.plan.id);

            if (_currentPlanUsage === null)
                return result.failed();

            if (_currentPlanUsage > subscription.plan.points)
                return result.failed("planPointsFinished");

            currentPlanUsage = _currentPlanUsage;
        }

        const res = await this.#openAI.multiTextMessage(message, historyMessages, selectedChat.model.name, user.id);

        if (res) {
            const tokenCount = res.totalTokens ?? (
                message + " " + res.output
            ).split(' ').length;

            const { cost, userPointCost } = modelCostCalculator({
                model: selectedChat.model,
                profitPercentage: config.openAI.feePercentage,
                tokenCount: tokenCount
            });

            await this.#openAIMessageRepository.create({
                chat: selectedChat,
                cost: cost,
                insertDate: new Date(),
                isDeleted: false,
                prompt: message,
                output: res.output,
                points: userPointCost,
                saved: user.saveMessages,
                plan: subscription ? subscription.plan : undefined
            });

            if (subscription && currentPlanUsage + userPointCost >= subscription.plan.points) {
                await this.#userSubscriptionRepository.updateById({
                    id: subscription.id,
                    isFinished: true
                });
            }

            return result.succeeded().setData(res.output);
        }

        return result.failed();
    }

    async textMessage(user: User, message: string) {
        if (this.#messageLock.isLocked(user.id))
            return new OperationResultWithData<string>().failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const result = await this.#textMessage(user, message);

        this.#messageLock.unlock(user.id);

        return result;
    }
}