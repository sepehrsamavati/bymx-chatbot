import fs from "node:fs/promises";
import type { ServicesType } from "../Container.js";
import { audioConvert } from "../helpers/audioConvert.js";
import type { User } from "../../../types/entities/user.js";
import { PlanType } from "../../../types/enums/planTypes.js";
import { getTempFilePath } from "../helpers/storageHelper.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import type { AIChat } from "../../../types/entities/aiChat.js";
import { AIModelType } from "../../../types/enums/aiModelType.js";
import systemMessageMapper from "../helpers/systemMessageMapper.js";
import { AIChatBehavior } from "../../../types/enums/aiChatBehavior.js";
import { openAiSupportedFileExtensions } from "../helpers/fileHelper.js";
import type { PromptBasicInfo } from "../../../types/entities/prompt.js";
import { OperationResultWithData } from "../common/dto/OperationResult.js";
import type { UserTempFile } from "../../../types/entities/userTempFile.js";
import { modelCostCalculator, modelCostPredication } from "../helpers/costCalculator.js";
import type { IOpenAIAudioResult, IOpenAITextResult, IOpenAITextResultWithFile } from "../../../types/contracts/services.js";

export type IOpenAITextResponse = IOpenAITextResult & {
    pointUsage: number;
}

export type IOpenAIAudioResponse = IOpenAIAudioResult & {
    pointUsage: number;
}

export type IOpenAITextWithFileResponse = IOpenAITextResultWithFile & {
    pointUsage: number;
}

export default class OpenAIApplication {
    #openAI;
    #aiChatRepository;
    #promptRepository;
    #userApplication;
    #userRepository;
    #userTempFileApplication;
    #userSubscriptionApplication;
    #aiModelCache;
    #messageLock;

    constructor(container: ServicesType) {
        this.#openAI = container.openAI;
        this.#aiChatRepository = container.aiChatRepository;
        this.#promptRepository = container.promptRepository;
        this.#userApplication = container.userApplication;
        this.#userRepository = container.userRepository;
        this.#userTempFileApplication = container.userTempFileApplication;
        this.#userSubscriptionApplication = container.userSubscriptionApplication;
        this.#aiModelCache = container.aiModelCache;
        this.#messageLock = container.aiMessageLockCache;
    }

    async #middleware(user: User) {
        const result = new OperationResultWithData<any>().failed("errorOccurred");

        if (user.status !== UserStatus.OK)
            return result.failed("shouldAcceptTermsOfService");

        let selectedChat = user.selectedChat;

        if (!selectedChat) {
            const hasChats = await this.#aiChatRepository.exists(user.id);

            if (hasChats === null)
                return result.failed(); // error

            if (hasChats)
                return result.failed("selectChatBeforeUse"); // select chat

            const defaultModel = await this.#aiModelCache.getDefault();

            const openAIChat = {
                title: "",
                user: user,
                model: defaultModel,
                behavior: AIChatBehavior.None,
                isHidden: false,
            } satisfies Partial<AIChat>;

            const defaultChatId = await this.#aiChatRepository.create({
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

        let historyMessages: PromptBasicInfo[] = [];

        if (user.memoryAmount && user.saveMessages) {
            const _historyMessages = await this.#promptRepository.getRecentHistory(selectedChat.id, user.memoryAmount);

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
            systemMessage: systemMessageMapper(selectedChat.behavior),
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

            await this.#promptRepository.create({
                chat: selectedChat,
                cost: cost,
                insertDate: new Date(),
                isDeleted: false,
                input: textMessage,
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

    async #audio(user: User, audioFile: UserTempFile): Promise<OperationResultWithData<IOpenAITextResponse>> {
        const _middlewareResult = await this.#middleware(user);

        if (_middlewareResult instanceof OperationResultWithData)
            return _middlewareResult;

        let audioFileData = await fs.readFile(getTempFilePath(audioFile));

        try {
            const wavBuffer = await audioConvert(audioFileData, "wav");
            audioFileData = wavBuffer;
            // You can now use the wavBuffer as needed
        } catch (error) {
            console.error('Error during conversion:', error);
            debugger
        }

        const { selectedChat, historyMessages, totalRemainingPoints, result, subscriptions } = _middlewareResult;

        const inputUnits = 500;

        const audioModel = this.#aiModelCache.getCurrentCache().find(model => model.title === selectedChat.model.title && model.type === AIModelType.TextAndAudio);
        if (!audioModel)
            return result.failed("audioNotSupported");

        const predictedCost = modelCostPredication({
            isAudio: true,
            inputUnits: inputUnits,
            model: audioModel,
            pointUsageLimit: totalRemainingPoints
        });

        if (predictedCost.inputLimit)
            return result.failed();

        const sendLangToGpt = inputUnits < 3 && historyMessages.length === 0;

        const startTime = performance.now();
        const res = await this.#openAI.multiAudioMessage({
            inputMessage: audioFileData.toString("base64"),
            messages: historyMessages,
            model: audioModel,
            userId: user.id,
            tokenLimit: predictedCost.outputTokens,
            languageCode: sendLangToGpt ? user.lang : undefined
        });
        const responseTime = performance.now() - startTime;

        if (res) {
            const { cost, userPointCost } = modelCostCalculator({
                isAudio: true,
                model: audioModel,
                inputUnits: res.inputTokens,
                outputUnits: res.outputTokens,
            });

            const savedUsageIds = await this.#userSubscriptionApplication.saveSubscriptionsUsage(userPointCost, subscriptions);

            await this.#promptRepository.create({
                chat: selectedChat,
                cost: cost,
                insertDate: new Date(),
                isDeleted: false,
                input: "[AUDIO]",
                output: res.output,
                points: userPointCost,
                model: audioModel.name,
                saved: false,
                usages: savedUsageIds ?? [],
                promptUser: user,
                responseTime: responseTime,
                fileId: audioFile.fsId,
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

    async audioMessage(user: User, audioFile: UserTempFile): Promise<OperationResultWithData<IOpenAITextResponse>> {
        if (this.#messageLock.isLocked(user.id))
            return new OperationResultWithData<IOpenAITextResponse>().failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const result = await this.#audio(user, audioFile);

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

    // async imageGenerate(user: User, message: string): Promise<OperationResultWithData<IOpenAIGeneratedImageResponse>> {
    //     const _middlewareResult = await this.#middleware(user);

    //     if (_middlewareResult instanceof OperationResultWithData)
    //         return _middlewareResult;

    //     const { selectedChat, totalRemainingPoints, subscriptions } = _middlewareResult;

    //     const result = new OperationResultWithData<IOpenAIGeneratedImageResponse>().failed("errorOccurred");

    //     if (totalRemainingPoints < 20)
    //         return result.failed("pointNotEnough");

    //     if (this.#messageLock.isLocked(user.id))
    //         return result.failed("youHavePendingPrompts");

    //     this.#messageLock.lock(user.id);

    //     const startTime = performance.now();
    //     const res = await this.#openAI.simpleImageGenerate(user.id, message);
    //     const responseTime = performance.now() - startTime;

    //     if (res?.url) {
    //         const userPointCost = calculatePointUsage({ usdCent: res.costUsdCent });

    //         result.succeeded().setData({
    //             url: res.url,
    //             pointUsage: userPointCost
    //         });

    //         const savedUsageIds = await this.#userSubscriptionApplication.saveSubscriptionsUsage(userPointCost, subscriptions);

    //         await this.#openAIMessageRepository.create({
    //             chat: selectedChat,
    //             cost: res.costUsdCent / 100,
    //             insertDate: new Date(),
    //             isDeleted: false,
    //             prompt: message,
    //             output: res.url,
    //             points: userPointCost,
    //             model: "dall-e-2",
    //             saved: false,
    //             usages: savedUsageIds ?? [],
    //             promptUser: user,
    //             responseTime: responseTime,
    //         });
    //     } else if (res?.contentPolicyViolation) {
    //         result.failed("promptContentNotAllowed");
    //     }

    //     this.#messageLock.unlock(user.id);

    //     return result;
    // }

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

        await this.#promptRepository.create({
            chat: selectedChat,
            cost: cost,
            insertDate: new Date(),
            isDeleted: false,
            input: message,
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