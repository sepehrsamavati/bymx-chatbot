import fs from "node:fs/promises";
import type { ServicesType } from "../Container.js";
import type { User } from "../../../types/entities/user.js";
import { getTempFilePath } from "../helpers/storageHelper.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import type { OpenAIChat } from "../../../types/entities/openAIChat.js";
import { openAiSupportedFileExtensions } from "../helpers/fileHelper.js";
import { OperationResultWithData } from "../common/dto/OperationResult.js";
import type { UserTempFile } from "../../../types/entities/userTempFile.js";
import openAISystemMessageMapper from "../helpers/openAISystemMessageMapper.js";
import { OpenAISystemMessage } from "../../../types/enums/openAISystemMessages.js";
import type { UserSubscription } from "../../../types/entities/userSubscription.js";
import type { OpenAIMessageBasicInfo } from "../../../types/entities/openAIMessage.js";
import { calculatePointUsage, modelCostCalculator, modelCostPredication } from "../helpers/openAICostCalculator.js";
import type { IOpenAIImageResult, IOpenAITextResult, IOpenAITextResultWithFile } from "../../../types/contracts/services.js";
import { PlanType } from "../../../types/enums/planTypes.js";

export type IOpenAITextResponse = IOpenAITextResult & {
    pointUsage: number;
}

export type IOpenAIGeneratedImageResponse = Pick<IOpenAIImageResult, 'url'> & {
    pointUsage: number;
}

export type IOpenAITextWithFileResponse = IOpenAITextResultWithFile & {
    pointUsage: number;
}

export default class OpenAIApplication {
    #openAI;
    #openAIChatRepository;
    #openAIMessageRepository;
    #userApplication;
    #userRepository;
    #userTempFileApplication;
    #userSubscriptionApplication;
    #openAIModelCache;
    #messageLock;

    constructor(container: ServicesType) {
        this.#openAI = container.openAI;
        this.#openAIChatRepository = container.openAIChatRepository;
        this.#openAIMessageRepository = container.openAIMessageRepository;
        this.#userApplication = container.userApplication;
        this.#userRepository = container.userRepository;
        this.#userTempFileApplication = container.userTempFileApplication;
        this.#userSubscriptionApplication = container.userSubscriptionApplication;
        this.#openAIModelCache = container.openAIModelCache;
        this.#messageLock = container.openAIMessageLockCache;
    }

    async #middleware(user: User) {
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
                behavior: OpenAISystemMessage.None,
                isHidden: false,
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

        const { subscriptions, totalRemainingPoints } = await this.#userSubscriptionApplication.getActiveSubscriptions(user.id, true) ?? {};

        const dailyFreeSubscription = subscriptions?.find(subscription => subscription.plan.type === PlanType.DailyFree);

        if (!(subscriptions && dailyFreeSubscription && totalRemainingPoints !== undefined))
            return result.failed();

        let historyMessages: OpenAIMessageBasicInfo[] = [];

        if (user.memoryAmount && user.saveMessages) {
            const _historyMessages = await this.#openAIMessageRepository.getRecentHistory(selectedChat.id, user.memoryAmount);

            if (_historyMessages === null)
                return result.failed();

            historyMessages = _historyMessages.reverse();
        }

        if (totalRemainingPoints <= 0) {
            return result.failed("noPointAvailable");
        }

        return {
            result,
            selectedChat,
            subscriptions,
            historyMessages,
            totalRemainingPoints,
        };
    }

    async #message(user: User, textMessage: string, opts?: {
        imageUrl?: string;
        plainTextTempFile?: UserTempFile;
    }): Promise<OperationResultWithData<IOpenAITextResponse>> {
        const _middlewareResult = await this.#middleware(user);

        if (_middlewareResult instanceof OperationResultWithData)
            return _middlewareResult;

        const { selectedChat, historyMessages, totalRemainingPoints, result, subscriptions } = _middlewareResult;

        const inputUnits = textMessage.split(' ').length + (opts?.imageUrl ? 500 : 0);

        const predictedCost = modelCostPredication({
            inputUnits: inputUnits,
            model: selectedChat.model,
            pointUsageLimit: totalRemainingPoints
        });

        if (predictedCost.inputLimit)
            return result.failed();

        if (opts?.plainTextTempFile) {
            const byteArrayData = await fs.readFile(getTempFilePath(opts.plainTextTempFile));
            textMessage += `\n\nFile extension=${opts.plainTextTempFile.extension}\nFile content=\n${byteArrayData.toString()}`;
        }

        const sendLangToGpt = inputUnits < 3 && historyMessages.length === 0;

        const startTime = performance.now();
        const res = await this.#openAI.multiTextMessage({
            inputMessage: textMessage,
            messages: historyMessages,
            model: selectedChat.model,
            systemMessage: openAISystemMessageMapper(selectedChat.behavior),
            userId: user.id,
            tokenLimit: predictedCost.outputTokens,
            imageUrl: opts?.imageUrl,
            languageCode: sendLangToGpt ? user.lang : undefined
        });
        const responseTime = performance.now() - startTime;

        if (res) {
            const { cost, userPointCost } = modelCostCalculator({
                model: selectedChat.model,
                inputUnits: res.inputTokens,
                outputUnits: res.outputTokens,
            });

            const savedUsageIds = await this.#userSubscriptionApplication.saveSubscriptionsUsage(userPointCost, subscriptions);

            await this.#openAIMessageRepository.create({
                chat: selectedChat,
                cost: cost,
                insertDate: new Date(),
                isDeleted: false,
                prompt: textMessage,
                output: res.output,
                points: userPointCost,
                model: selectedChat.model.name,
                saved: user.saveMessages,
                usages: savedUsageIds ?? [],
                promptUser: user,
                responseTime: responseTime,
            });

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

        const result = await this.#message(user, message);

        this.#messageLock.unlock(user.id);

        return result;
    }

    async plainFileMessage(user: User, textMessage: string, plainTextTempFile: UserTempFile): Promise<OperationResultWithData<IOpenAITextResponse>> {
        if (this.#messageLock.isLocked(user.id))
            return new OperationResultWithData<IOpenAITextResponse>().failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const result = await this.#message(user, textMessage, { plainTextTempFile });

        this.#messageLock.unlock(user.id);

        return result;
    }

    async imageMessage(user: User, message: string, imageUrl: string): Promise<OperationResultWithData<IOpenAITextResponse>> {
        if (this.#messageLock.isLocked(user.id))
            return new OperationResultWithData<IOpenAITextResponse>().failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const result = await this.#message(user, message, { imageUrl });

        this.#messageLock.unlock(user.id);

        return result;
    }

    async imageGenerate(user: User, message: string): Promise<OperationResultWithData<IOpenAIGeneratedImageResponse>> {
        const _middlewareResult = await this.#middleware(user);

        if (_middlewareResult instanceof OperationResultWithData)
            return _middlewareResult;

        const { selectedChat, totalRemainingPoints, subscriptions } = _middlewareResult;

        const result = new OperationResultWithData<IOpenAIGeneratedImageResponse>().failed("errorOccurred");

        if (totalRemainingPoints < 20)
            return result.failed("pointNotEnough");

        if (this.#messageLock.isLocked(user.id))
            return result.failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const startTime = performance.now();
        const res = await this.#openAI.simpleImageGenerate(user.id, message);
        const responseTime = performance.now() - startTime;

        if (res?.url) {
            const userPointCost = calculatePointUsage({ usdCent: res.costUsdCent });

            result.succeeded().setData({
                url: res.url,
                pointUsage: userPointCost
            });

            const savedUsageIds = await this.#userSubscriptionApplication.saveSubscriptionsUsage(userPointCost, subscriptions);

            await this.#openAIMessageRepository.create({
                chat: selectedChat,
                cost: res.costUsdCent / 100,
                insertDate: new Date(),
                isDeleted: false,
                prompt: message,
                output: res.url,
                points: userPointCost,
                model: "dall-e-2",
                saved: false,
                usages: savedUsageIds ?? [],
                promptUser: user,
                responseTime: responseTime,
            });
        } else if (res?.contentPolicyViolation) {
            result.failed("promptContentNotAllowed");
        }

        this.#messageLock.unlock(user.id);

        return result;
    }

    async fileWithMessage(opts: {
        tempFile: UserTempFile;
        message: string;
    }): Promise<OperationResultWithData<IOpenAITextWithFileResponse>> {
        const { tempFile, message } = opts, user = tempFile.user;
        const guardResult = new OperationResultWithData<any>();

        if (!openAiSupportedFileExtensions.fileSearch.includes(tempFile.extension))
            return guardResult.failed("fileNotSupported");

        if (this.#messageLock.isLocked(user.id))
            return guardResult.failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const _middlewareResult = await this.#middleware(user);

        if (_middlewareResult instanceof OperationResultWithData) {
            this.#messageLock.unlock(user.id);
            return _middlewareResult;
        }

        const { selectedChat, historyMessages, result, subscriptions } = _middlewareResult;

        const startTime = performance.now();
        const { result: res, file: fileUpdateInfo } = await this.#openAI.fileSearch({
            inputMessage: message,
            messages: historyMessages,
            tempFile,
            model: selectedChat.model
        });
        const responseTime = performance.now() - startTime;

        if (!res) {
            this.#messageLock.unlock(user.id);
            return result.failed();
        }

        if ((!tempFile.openAiFileId || tempFile.vectorIds.length === 0) // file oai info not stored
            && (fileUpdateInfo.fileId || fileUpdateInfo.vectorIds)) // file oai info is available
            await this.#userTempFileApplication.setOpenAiInfo(tempFile.fsId, { // stored file info
                openAiFileId: fileUpdateInfo.fileId,
                vectorIds: fileUpdateInfo.vectorIds
            });

        const { cost, userPointCost } = modelCostCalculator({
            model: selectedChat.model,
            inputUnits: res.inputTokens,
            outputUnits: res.outputTokens,
        });

        const savedUsageIds = await this.#userSubscriptionApplication.saveSubscriptionsUsage(userPointCost, subscriptions);

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
            fileId: tempFile.fsId,
            usages: savedUsageIds ?? [],
            promptUser: user,
            responseTime: responseTime,
        });

        this.#messageLock.unlock(user.id);

        return result.succeeded().setData({
            result: res,
            file: fileUpdateInfo,
            pointUsage: userPointCost
        } satisfies IOpenAITextWithFileResponse);
    }
}