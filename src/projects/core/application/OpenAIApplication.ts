import type { ServicesType } from "../Container.js";
import type { User } from "../../../types/entities/user.js";
import { UserType } from "../../../types/enums/userTypes.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import type { OpenAIChat } from "../../../types/entities/openAIChat.js";
import { OperationResultWithData } from "../common/dto/OperationResult.js";
import type { UserTempFile } from "../../../types/entities/userTempFile.js";
import type { OpenAIMessage } from "../../../types/entities/openAIMessage.js";
import openAISystemMessageMapper from "../helpers/openAISystemMessageMapper.js";
import { OpenAISystemMessage } from "../../../types/enums/openAISystemMessages.js";
import type { UserSubscription } from "../../../types/entities/userSubscription.js";
import { modelCostCalculator, modelCostPredication } from "../helpers/openAICostCalculator.js";
import type { IOpenAITextResult, IOpenAITextResultWithFile } from "../../../types/contracts/services.js";

export type IOpenAITextResponse = IOpenAITextResult & {
    pointUsage: number;
}

export type IOpenAITextWithFileResponse = IOpenAITextResultWithFile & {
    pointUsage: number;
}

export default class OpenAIApplication {
    #openAI;
    #openAIChatRepository;
    #openAIMessageRepository;
    #userSubscriptionRepository;
    #userRepository;
    #userApplication;
    #userTempFileApplication;
    #openAIModelCache;
    #messageLock;

    constructor(container: ServicesType) {
        this.#openAI = container.openAI;
        this.#openAIChatRepository = container.openAIChatRepository;
        this.#openAIMessageRepository = container.openAIMessageRepository;
        this.#userSubscriptionRepository = container.userSubscriptionRepository;
        this.#userRepository = container.userRepository;
        this.#userApplication = container.userApplication;
        this.#userTempFileApplication = container.userTempFileApplication;
        this.#openAIModelCache = container.openAIModelCache;
        this.#messageLock = container.openAIMessageLockCache;
    }

    async #middleware(user: User, message: string) {
        const result = new OperationResultWithData<any>().failed("errorOccurred");

        if (user.status !== UserStatus.OK)
            return result.failed("shouldAcceptTermsOfService");

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
                behavior: OpenAISystemMessage.Baymax,
                isHidden: true
            } satisfies Partial<OpenAIChat>;

            const defaultChatId = await this.#openAIChatRepository.create({
                ...openAIChat,
                insertDate: new Date(),
                isDeleted: false,
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

        const freePointUsage = await this.#userApplication.getFreePointStatus(user.id);

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
        let remainingPoints = freePointUsage.remaining;

        if (remainingPoints <= 0) {
            subscription = await this.#userSubscriptionRepository.getActive(user.id, new Date());

            if (!subscription)
                return result.failed("noPointAvailable");

            const _currentPlanUsage = await this.#openAIMessageRepository.getPlanPointUsage(subscription.plan.id);

            if (_currentPlanUsage === null)
                return result.failed();

            if (_currentPlanUsage > subscription.plan.points)
                return result.failed("planPointsFinished");

            currentPlanUsage = _currentPlanUsage;
            remainingPoints = subscription.plan.points - _currentPlanUsage;
        }

        return {
            result,
            selectedChat,
            remainingPoints,
            historyMessages,
            subscription,
            currentPlanUsage,
        };
    }

    async #textMessage(user: User, message: string): Promise<OperationResultWithData<IOpenAITextResponse>> {
        const _middlewareResult = await this.#middleware(user, message);

        if (_middlewareResult instanceof OperationResultWithData)
            return _middlewareResult;

        const { selectedChat, currentPlanUsage, historyMessages, remainingPoints, result, subscription } = _middlewareResult;

        const predictedCost = modelCostPredication({
            inputUnits: message.split(' ').length,
            model: selectedChat.model,
            pointUsageLimit: remainingPoints
        });

        if (predictedCost.inputLimit)
            return result.failed();

        const res = await this.#openAI.multiTextMessage({
            inputMessage: message,
            messages: historyMessages,
            model: selectedChat.model,
            systemMessage: openAISystemMessageMapper(selectedChat.behavior),
            userId: user.id,
            tokenLimit: predictedCost.outputTokens
        });

        if (res) {
            const { cost, userPointCost } = modelCostCalculator({
                model: selectedChat.model,
                inputUnits: res.inputTokens,
                outputUnits: res.outputTokens,
            });

            await this.#openAIMessageRepository.create({
                chat: selectedChat,
                cost: cost,
                insertDate: new Date(),
                isDeleted: false,
                prompt: message,
                output: res.output,
                points: userPointCost,
                model: selectedChat.model.name,
                saved: user.saveMessages,
                plan: subscription ? subscription.plan : undefined
            });

            if (subscription && currentPlanUsage + userPointCost >= subscription.plan.points) {
                await this.#userSubscriptionRepository.updateById({
                    id: subscription.id,
                    isFinished: true
                });
            }

            return result.succeeded().setData({
                ...res,
                pointUsage: userPointCost
            });
        }

        return result.failed();
    }

    async textMessage(user: User, message: string): Promise<OperationResultWithData<IOpenAITextResponse>> {
        if (this.#messageLock.isLocked(user.id))
            return new OperationResultWithData<IOpenAITextResponse>().failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const result = await this.#textMessage(user, message);

        this.#messageLock.unlock(user.id);

        return result;
    }

    async fileWithMessage(opts: {
        tempFile: UserTempFile;
        message: string;
    }): Promise<OperationResultWithData<IOpenAITextWithFileResponse>> {
        const { tempFile, message } = opts;
        const user = tempFile.user;

        if (user.type !== UserType.Owner)
            return new OperationResultWithData<IOpenAITextWithFileResponse>().failed("soon");

        if (this.#messageLock.isLocked(user.id))
            return new OperationResultWithData<IOpenAITextWithFileResponse>().failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const _middlewareResult = await this.#middleware(user, message);

        if (_middlewareResult instanceof OperationResultWithData) {
            this.#messageLock.unlock(user.id);
            return _middlewareResult;
        }

        const { selectedChat, historyMessages, result, subscription } = _middlewareResult;

        const res = await this.#openAI.fileSearch({
            inputMessage: message,
            messages: historyMessages,
            tempFile,
            model: selectedChat.model
        });

        if (!res) {
            this.#messageLock.unlock(user.id);
            return result.failed();
        }

        if (!tempFile.openAiFileId)
            await this.#userTempFileApplication.setOpenAiInfo(tempFile.fsId, {
                openAiFileId: res.fileId,
                vectorIds: res.vectorIds
            });

        const { cost, userPointCost } = modelCostCalculator({
            model: selectedChat.model,
            inputUnits: res.inputTokens,
            outputUnits: res.outputTokens,
        });

        await this.#openAIMessageRepository.create({
            chat: selectedChat,
            cost: cost,
            insertDate: new Date(),
            isDeleted: false,
            prompt: message,
            output: res.output,
            points: userPointCost,
            model: selectedChat.model.name,
            saved: user.saveMessages,
            plan: subscription ? subscription.plan : undefined
        });

        this.#messageLock.unlock(user.id);

        return result.succeeded().setData({
            ...res,
            pointUsage: userPointCost
        });
    }
}