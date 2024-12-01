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
                behavior: OpenAISystemMessage.None,
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

        let historyMessages: OpenAIMessageBasicInfo[] = [];

        if (user.memoryAmount && user.saveMessages) {
            const _historyMessages = await this.#openAIMessageRepository.getRecentHistory(selectedChat.id, user.memoryAmount);

            if (_historyMessages === null)
                return result.failed();

            historyMessages = _historyMessages.reverse();
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

    async #message(user: User, textMessage: string, opts?: {
        imageUrl?: string;
        plainTextTempFile?: UserTempFile;
    }): Promise<OperationResultWithData<IOpenAITextResponse>> {
        const _middlewareResult = await this.#middleware(user, textMessage);

        if (_middlewareResult instanceof OperationResultWithData)
            return _middlewareResult;

        const { selectedChat, currentPlanUsage, historyMessages, remainingPoints, result, subscription } = _middlewareResult;

        const predictedCost = modelCostPredication({
            inputUnits: textMessage.split(' ').length + (opts?.imageUrl ? 500 : 0),
            model: selectedChat.model,
            pointUsageLimit: remainingPoints
        });

        if (predictedCost.inputLimit)
            return result.failed();

        if (opts?.plainTextTempFile) {
            const byteArrayData = await fs.readFile(getTempFilePath(opts.plainTextTempFile));
            textMessage += `\n\nFile extension=${opts.plainTextTempFile.extension}\nFile content=\n${byteArrayData.toString()}`;
        }

        const res = await this.#openAI.multiTextMessage({
            inputMessage: textMessage,
            messages: historyMessages,
            model: selectedChat.model,
            systemMessage: openAISystemMessageMapper(selectedChat.behavior),
            userId: user.id,
            tokenLimit: predictedCost.outputTokens,
            imageUrl: opts?.imageUrl
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
                prompt: textMessage,
                output: res.output,
                points: userPointCost,
                model: selectedChat.model.name,
                saved: user.saveMessages,
                plan: subscription ? subscription.plan : undefined,
                promptUser: user
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

        const _middlewareResult = await this.#middleware(user, message);

        if (_middlewareResult instanceof OperationResultWithData) {
            this.#messageLock.unlock(user.id);
            return _middlewareResult;
        }

        const { selectedChat, historyMessages, result, subscription } = _middlewareResult;

        const { result: res, file: fileUpdateInfo } = await this.#openAI.fileSearch({
            inputMessage: message,
            messages: historyMessages,
            tempFile,
            model: selectedChat.model
        });

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
            plan: subscription ? subscription.plan : undefined,
            promptUser: user
        });

        this.#messageLock.unlock(user.id);

        return result.succeeded().setData({
            result: res,
            file: fileUpdateInfo,
            pointUsage: userPointCost
        } satisfies IOpenAITextWithFileResponse);
    }
}