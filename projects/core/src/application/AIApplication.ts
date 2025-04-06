import { franc } from "franc-min";
import config from "../config.js";
import fs from "node:fs/promises";
import { fal } from "@fal-ai/client";
import { ServicesType } from "../Container.js";
import urls from "../helpers/httpServerUrls.js";
import { User } from "../types/entities/user.js";
import { errorLogger } from "../helpers/logger.js";
import { AIChat } from "../types/entities/aiChat.js";
import translate from "@iamtraction/google-translate";
import { PlanType } from "../types/enums/planTypes.js";
import { UserStatus } from "../types/enums/userStatus.js";
import { countTokens } from "../helpers/lmTokenHelper.js";
import { getAudioDuration } from "../helpers/audioUtils.js";
import { getTempFilePath } from "../helpers/storageHelper.js";
import { PromptBasicInfo } from "../types/entities/prompt.js";
import { AIChatBehavior } from "../types/enums/aiChatBehavior.js";
import { IOpenAITextResult } from "../types/contracts/services.js";
import { AIModelProvider } from "../types/enums/aiModelProvider.js";
import systemMessageMapper from "../helpers/systemMessageMapper.js";
import type { UserTempFile } from "../types/entities/userTempFile.js";
import { GenerationTaskType } from "../types/enums/generationTaskType.js";
import { getFileContent } from "../helpers/fileContent/fileContent.runner.js";
import type { AIGeneratedMediaResponse } from "../types/contracts/aiResponse.js";
import { OperationResult, OperationResultWithData } from "../common/dto/OperationResult.js";
import { falAiSupportedFileExtensions, extractableFileContentExtensions } from "../helpers/fileHelper.js";
import { calculatePointUsage, modelCostCalculator, modelCostPredication } from "../helpers/costCalculator.js";

type MultiModalInput = {
    text: { text: string; };
    voice: {
        voice: {
            file: UserTempFile;
            duration?: number;
        } | undefined;
    };
};

type MultiModalInputAttachment = {
    file: { file: UserTempFile | undefined; };
    image: { image: UserTempFile | undefined; };
}

type MultiModalOutput = {
    plainText: string;
    pointUsage: number;
    isComplete: boolean;
    audio?: {
        data: Buffer;
        /** Seconds */
        duration: number;
    };
}

type FalAiResponse = Awaited<ReturnType<typeof fal.subscribe>>;
type FalAiQueueSubmitResponse = Awaited<ReturnType<typeof fal.queue.submit>>;

fal.config({
    credentials: config.falAI.apiToken,
});

export default class AIApplication {
    #messageLock;
    #promptRepository;
    #aiModelCache;
    #userSubscriptionApplication;
    #openAI;
    #openRouter;
    #aiChatRepository;
    #userRepository;
    #userTempFileApplication;
    #generationTaskApplication;

    #fluxModelName = "fal-ai/flux/schnell";
    #trellisModelName = "fal-ai/trellis";
    #auraSrUpscaleModelName = "fal-ai/aura-sr";
    #minimaxModelName = "fal-ai/minimax-music";

    constructor(container: ServicesType) {
        this.#aiModelCache = container.aiModelCache;
        this.#messageLock = container.aiMessageLockCache;
        this.#promptRepository = container.promptRepository;
        this.#userSubscriptionApplication = container.userSubscriptionApplication;
        this.#openAI = container.openAI;
        this.#openRouter = container.openRouter;
        this.#aiChatRepository = container.aiChatRepository;
        this.#userRepository = container.userRepository;
        this.#userTempFileApplication = container.userTempFileApplication;
        this.#generationTaskApplication = container.generationTaskApplication;
    }

    /**
     * - Used as ToS guard
     * - Initialize and select user chat if not created before
     * - Get subscriptions and chat history
     * - Get points remaining
     * @returns Info on success / Operation result on error/fail
     */
    private async middleware(user: User) {
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

        if (selectedChat.model?.isDeleted !== false)
            return result.failed("modelNotAvailable");

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

        const modelIsFree = selectedChat.model.provider === AIModelProvider.OpenRouter && (selectedChat.model.pricePmu.input + selectedChat.model.pricePmu.output === 0);

        if (!modelIsFree && totalRemainingPoints <= 0) {
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

    async fluxImageGenerate(user: User, message: string): Promise<OperationResultWithData<AIGeneratedMediaResponse>> {
        const result = new OperationResultWithData<AIGeneratedMediaResponse>().failed("errorOccurred");

        const model = this.#aiModelCache.getModelByName(this.#fluxModelName);
        if (!model)
            return result.failed();

        const costUsdCent = model.pricePmu.output / (1_000_000 * 100); // 0.3;
        const userPointCost = calculatePointUsage({ usdCent: costUsdCent + (((config.feePercentage * costUsdCent) / 100)) });

        const { subscriptions, totalRemainingPoints } = await this.#userSubscriptionApplication.getActiveSubscriptions(user.id, true) ?? {};

        if (!(subscriptions && totalRemainingPoints !== undefined))
            return result.failed();

        if (totalRemainingPoints <= 0)
            return result.failed("noPointAvailable");

        if (totalRemainingPoints < userPointCost)
            return result.failed("pointNotEnough");

        if (this.#messageLock.isLocked(user.id))

            return result.failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const startTime = performance.now();

        let prompt = message;

        const lang = franc(prompt);

        if (lang !== "eng") {
            try {
                const translateResult = await translate(prompt);
                prompt = translateResult.text;
            } catch (err) {
                errorLogger(`Translation failed for '${prompt}' user '${user.id}'`, err);
            }
        }

        const falResponse = await fal.subscribe(model.name, {
            input: {
                prompt,
                enable_safety_checker: true,
            },
            // logs: true,
            // onQueueUpdate: (update) => {
            //     if (update.status === "IN_PROGRESS") {
            //         update.logs.map((log) => log.message).forEach(console.log);
            //     }
            // },
        });

        const responseTime = performance.now() - startTime;

        const generatedImage = falResponse.data.images.at(0);
        if (generatedImage && falResponse.data.images.length === 1) {
            const contentPolicyViolation = 'has_nsfw_concepts' in falResponse.data && falResponse.data.has_nsfw_concepts?.includes(true);
            if (contentPolicyViolation) {
                result.failed("promptContentNotAllowed");
            }
            else {
                result
                    .succeeded()
                    .setData({
                        url: generatedImage.url,
                        pointUsage: userPointCost,
                        modelName: model.title,
                    });

                const savedUsageIds = await this.#userSubscriptionApplication.saveSubscriptionsUsage(userPointCost, subscriptions);

                await this.#promptRepository.create({
                    cost: costUsdCent / 100,
                    insertDate: new Date(),
                    isDeleted: false,
                    input: message,
                    output: generatedImage.url,
                    points: userPointCost,
                    model: model.name,
                    saved: false,
                    usages: savedUsageIds ?? [],
                    promptUser: user,
                    responseTime: responseTime,
                });
            }
        }

        this.#messageLock.unlock(user.id);

        return result;
    }

    async trellis3dModelGenerate(user: User, image: UserTempFile): Promise<OperationResultWithData<string>> {
        const result = new OperationResultWithData<string>().failed("errorOccurred");

        const model = this.#aiModelCache.getModelByName(this.#trellisModelName);
        if (!model)
            return result.failed();

        const hostedFileUrl = urls.v1.tempFile.createUrl(image.fsId);

        const costUsdCent = model.pricePmu.output / (1_000_000 * 100);
        const userPointCost = calculatePointUsage({ usdCent: costUsdCent + (((config.feePercentage * costUsdCent) / 100)) });

        const { subscriptions, totalRemainingPoints } = await this.#userSubscriptionApplication.getActiveSubscriptions(user.id, true) ?? {};

        if (!(subscriptions && totalRemainingPoints !== undefined))
            return result.failed();

        if (totalRemainingPoints <= 0)
            return result.failed("noPointAvailable");

        if (totalRemainingPoints < userPointCost)
            return result.failed("pointNotEnough");

        if (this.#messageLock.isLocked(user.id))
            return result.failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const startTime = new Date();
        const internalTaskId = this.#generationTaskApplication.newId();

        let falResponse: FalAiQueueSubmitResponse | null = null;

        try {
            falResponse = await fal.queue.submit(this.#trellisModelName, {
                input: {
                    image_url: hostedFileUrl.toString(),
                    ss_guidance_strength: 7.5,
                    ss_sampling_steps: 12,
                    slat_guidance_strength: 3,
                    slat_sampling_steps: 12,
                    mesh_simplify: 0.95,
                    texture_size: 1024,
                    enable_safety_checker: true,
                },
                webhookUrl: urls.v1.falAiSetResult.createUrl(internalTaskId).toString(),
            });
        } catch (err) {
            errorLogger(`fal.ai 3D model (trellis) generation request failed / Task: '${internalTaskId}'`, err);
        }

        if (falResponse) {
            const externalTaskId = falResponse.request_id;

            const savedUsageIds = await this.#userSubscriptionApplication.saveSubscriptionsUsage(userPointCost, subscriptions);

            const taskCreationResult = await this.#generationTaskApplication.create({
                expiry: new Date(startTime.getTime() + (1000 * 60 * 5)),
                promptInfo: {
                    cost: costUsdCent / 100,
                    points: userPointCost,
                    input: `[file:${image.fsId}]`,
                    saved: false,
                    fileId: image.fsId,
                },
                internalId: internalTaskId,
                externalId: externalTaskId,
                startDate: startTime,
                endDate: startTime,
                modelId: model.id,
                type: GenerationTaskType.FalAiTrellis3dModelGeneration,
                userId: user.id,
                usages: savedUsageIds ?? [],
            });

            if (taskCreationResult.ok)
                result.succeeded("modelIsBeingGeneratedPleaseWait").setData(internalTaskId);
            else
                result.failed("errorOccurred");
        }
        else
            result.failed("errorOccurred");

        this.#messageLock.unlock(user.id);

        return result;
    }

    async auraSrImageUpscaler(user: User, image: UserTempFile): Promise<OperationResultWithData<AIGeneratedMediaResponse>> {
        const result = new OperationResultWithData<AIGeneratedMediaResponse>().failed("errorOccurred");

        const model = this.#aiModelCache.getModelByName(this.#auraSrUpscaleModelName);
        if (!model)
            return result.failed();

        const hostedFileUrl = urls.v1.tempFile.createUrl(image.fsId);

        let costUsdCent = 0;
        let userPointCost = 0;

        const recalculateCost = (inferenceTime = 4) => {
            costUsdCent = inferenceTime * (model.pricePmu.output / (1_000_000 * 100));
            userPointCost = calculatePointUsage({ usdCent: costUsdCent + (((config.feePercentage * costUsdCent) / 100)) });
        };

        recalculateCost();

        const { subscriptions, totalRemainingPoints } = await this.#userSubscriptionApplication.getActiveSubscriptions(user.id, true) ?? {};

        if (!(subscriptions && totalRemainingPoints !== undefined))
            return result.failed();

        if (totalRemainingPoints <= 0)
            return result.failed("noPointAvailable");

        if (totalRemainingPoints < userPointCost)
            return result.failed("pointNotEnough");

        if (this.#messageLock.isLocked(user.id))
            return result.failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const startTime = performance.now();

        const falResponse = await fal.subscribe(model.name, {
            input: {
                enable_safety_checker: true,
                image_url: hostedFileUrl.toString(),
                upscaling_factor: 4,
                overlapping_tiles: true,
                checkpoint: "v2",
            },
        });

        const responseTime = performance.now() - startTime;

        recalculateCost(Math.ceil((responseTime / 1000) + 0.5));

        const generatedImage = falResponse.data.image;
        if (generatedImage && generatedImage.url) {
            const contentPolicyViolation = 'has_nsfw_concepts' in falResponse.data && falResponse.data.has_nsfw_concepts?.includes(true);
            if (contentPolicyViolation) {
                result.failed("promptContentNotAllowed");
            }
            else {
                result
                    .succeeded()
                    .setData({
                        url: generatedImage.url,
                        pointUsage: userPointCost,
                        modelName: model.title,
                    });

                const savedUsageIds = await this.#userSubscriptionApplication.saveSubscriptionsUsage(userPointCost, subscriptions);

                await this.#promptRepository.create({
                    cost: costUsdCent / 100,
                    insertDate: new Date(),
                    isDeleted: false,
                    input: `[file:${image.fsId}]`,
                    output: generatedImage.url,
                    points: userPointCost,
                    model: model.name,
                    saved: false,
                    usages: savedUsageIds ?? [],
                    promptUser: user,
                    responseTime: responseTime,
                    fileId: image.fsId,
                });
            }
        }

        this.#messageLock.unlock(user.id);

        return result;
    }

    async musicGenerateWithLyrics(user: User, opts: {
        audioFile: UserTempFile;
        lyrics: string;
    }): Promise<OperationResultWithData<string>> {
        const result = new OperationResultWithData<string>().failed("errorOccurred");
        const maxLyricsLength = 600;

        if (opts.lyrics.length > maxLyricsLength)
            return result.failed("lyricsTooLong");

        if (!falAiSupportedFileExtensions.isSupportedMinimaxMusicGen(opts.audioFile.extension))
            return result.failed("invalidInput");

        const audioFileData = await fs.readFile(
            getTempFilePath(opts.audioFile)
        );
        const audioLength = await getAudioDuration(audioFileData);

        if (!audioLength || audioLength <= 15 || audioLength >= 360)
            return result.failed("invalidInput");

        const model = this.#aiModelCache.getModelByName(this.#minimaxModelName);
        if (!model)
            return result.failed();

        const hostedFileUrl = urls.v1.tempFile.createUrl(opts.audioFile.fsId);

        const costUsdCent = model.pricePmu.output / (1_000_000 * 100);
        // const costUsdCent = 3.5;
        const userPointCost = calculatePointUsage({ usdCent: costUsdCent + (((config.feePercentage * costUsdCent) / 100)) });

        const { subscriptions, totalRemainingPoints } = await this.#userSubscriptionApplication.getActiveSubscriptions(user.id, true) ?? {};

        if (!(subscriptions && totalRemainingPoints !== undefined))
            return result.failed();

        if (totalRemainingPoints <= 0)
            return result.failed("noPointAvailable");

        if (totalRemainingPoints < userPointCost)
            return result.failed("pointNotEnough");

        if (this.#messageLock.isLocked(user.id))
            return result.failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        opts.lyrics = opts.lyrics.trim();

        if (opts.lyrics.length < 550 && opts.lyrics.includes('\n') && !(opts.lyrics.startsWith('##') || opts.lyrics.endsWith('##'))) {
            const lyricsWithAccompaniment = `## ${opts.lyrics} ##`;
            if (lyricsWithAccompaniment.length <= 600)
                opts.lyrics = lyricsWithAccompaniment;
        }

        const startTime = new Date();
        const internalTaskId = this.#generationTaskApplication.newId();

        let falResponse: FalAiQueueSubmitResponse | null = null;

        try {
            falResponse = await fal.queue.submit(this.#minimaxModelName, {
                input: {
                    prompt: opts.lyrics,
                    enable_safety_checker: true,
                    reference_audio_url: hostedFileUrl.toString(),
                },
                webhookUrl: urls.v1.falAiSetResult.createUrl(internalTaskId).toString(),
            });
        } catch (err) {
            errorLogger(`fal.ai music generation request failed / Task: '${internalTaskId}'`, err);
        }

        if (falResponse) {
            const externalTaskId = falResponse.request_id;

            const savedUsageIds = await this.#userSubscriptionApplication.saveSubscriptionsUsage(userPointCost, subscriptions);

            const taskCreationResult = await this.#generationTaskApplication.create({
                expiry: new Date(startTime.getTime() + (1000 * 60 * 5)),
                promptInfo: {
                    cost: costUsdCent / 100,
                    points: userPointCost,
                    input: opts.lyrics,
                    saved: false,
                    fileId: opts.audioFile.fsId,
                },
                internalId: internalTaskId,
                externalId: externalTaskId,
                startDate: startTime,
                endDate: startTime,
                modelId: model.id,
                type: GenerationTaskType.FalAiMiniMaxMusicGeneration,
                userId: user.id,
                usages: savedUsageIds ?? [],
            });

            if (taskCreationResult.ok)
                result.succeeded("musicIsBeingGeneratedPleaseWait").setData(internalTaskId);
            else
                result.failed("errorOccurred");
        }
        else
            result.failed("errorOccurred");

        this.#messageLock.unlock(user.id);

        return result;
    }

    private async _multiModalChatCompletion(
        user: User,
        inputMessage: MultiModalInput[keyof MultiModalInput],
        messageAttachment: MultiModalInputAttachment[keyof MultiModalInputAttachment] | {},
        opts?: {
            /** Optional; Prevent double getting data and validations */
            middlewareResult?: Awaited<ReturnType<typeof AIApplication.prototype.middleware>>;
        }
    ): Promise<OperationResultWithData<MultiModalOutput>> {
        const _middlewareResult = opts?.middlewareResult ?? await this.middleware(user);

        if (_middlewareResult instanceof OperationResultWithData)
            return _middlewareResult;

        const { subscriptions, selectedChat, historyMessages } = _middlewareResult;
        let { totalRemainingPoints } = _middlewareResult;
        const result = new OperationResultWithData<MultiModalOutput>();
        const userWantsVoiceResponse = user.voiceResponse.on;

        /** Use only in view / Do not use in app logic -> Call saveSubscriptionsUsage after each step */
        let totalUserPointUsage = 0;
        let extractableFileFsId: string | undefined = undefined;
        let userInputText = 'text' in inputMessage ? inputMessage.text : "";
        let inputTextForModel = userInputText;

        // Convert user speech to text (to send to model)
        if ('voice' in inputMessage && inputMessage.voice) {
            if (inputMessage.voice.duration) {
                const predictedPointCost = calculatePointUsage({ usd: (inputMessage.voice.duration * this.#openAI.speechToTextPmu) / 1e6 });
                if (totalRemainingPoints - predictedPointCost < 1)
                    return result.failed("pointNotEnough");
            }

            const userTextMessage = await this.#openAI.speechToText({
                inputAudioPath: getTempFilePath(inputMessage.voice.file),
                prompt: user.voiceResponse.languagePrompt,
            });

            if (!userTextMessage)
                return result.failed();

            const speechToTextUserPointCost = calculatePointUsage({ usd: (userTextMessage.duration * this.#openAI.speechToTextPmu) / 1e6 });
            totalUserPointUsage += speechToTextUserPointCost;
            totalRemainingPoints -= speechToTextUserPointCost;

            await this.#userSubscriptionApplication.saveSubscriptionsUsage(speechToTextUserPointCost, subscriptions);

            // Couldn't retrieve text from user speech audio
            if (userTextMessage.output.length === 0) {
                return result.failed("noContentInAudio").setData({
                    pointUsage: speechToTextUserPointCost,
                    plainText: "",
                    isComplete: false,
                });
            }

            userInputText = userTextMessage.output;
            inputTextForModel = userInputText;
        }

        if ('file' in messageAttachment && messageAttachment.file && extractableFileContentExtensions.includes(messageAttachment.file.extension)) { // extract file content of requested file
            extractableFileFsId = messageAttachment.file.fsId;
            const fileContent = await getFileContent(getTempFilePath(messageAttachment.file));
            if (fileContent)
                inputTextForModel += `\n\nFile extension=${messageAttachment.file.extension}\nFile content=\n${fileContent}`;
        } else { // extract content from latest file in messages history
            const lastMessageWithFileIndex = historyMessages.findLastIndex(msg => typeof msg.fileId === "string"); // get latest message in history with attachment
            const lastExtractableFileFsId = lastMessageWithFileIndex !== -1 ? historyMessages.at(lastMessageWithFileIndex)?.fileId : undefined;
            if (lastExtractableFileFsId) {
                const tempFile = await this.#userTempFileApplication.getByFsId(lastExtractableFileFsId);
                if (tempFile.ok && tempFile.data) {
                    const fileContent = await getFileContent(getTempFilePath(tempFile.data));
                    if (fileContent)
                        historyMessages[lastMessageWithFileIndex].input += `\n\nFile extension=${tempFile.data.extension}\nFile content=\n${fileContent}`; // modify user input from history temporary so that model can see file content
                }
            }
        }

        const image = 'image' in messageAttachment ? messageAttachment.image : undefined;
        const inputTokens = countTokens(inputTextForModel, selectedChat.model.name) + (image ? 500 : 0);

        if (image && selectedChat.model.provider !== AIModelProvider.OpenAI)
            return result.failed("modelOnlySupportsText");

        const predictedCost = modelCostPredication({
            inputUnits: inputTokens,
            model: selectedChat.model,
            pointUsageLimit: totalRemainingPoints,
            offsetCost: historyMessages.map(msg => msg.cost).reduce((a, b) => a + b, 0)
        });

        if (predictedCost.inputLimit)
            return result.failed("pointNotEnough");

        const historyTokensCount = countTokens(historyMessages.map(m => m.input + "\n" + m.output).join('\n'), selectedChat.model.name);

        if ((historyTokensCount + inputTokens) >= selectedChat.model.llmInfo.contextWindow)
            return result.failed("modelMemoryExceeded");

        let resultData: IOpenAITextResult;
        const sendLangToGpt = inputTokens < 3 && historyMessages.length === 0;


        /* --START-- */
        let imageUrl: string | undefined = undefined;
        if (image) {
            imageUrl = urls.v1.tempFile.createUrl(image.fsId).toString();
        }

        const startTime = performance.now();
        const res = await (selectedChat.model.provider === AIModelProvider.OpenAI ? this.#openAI : this.#openRouter).multiTextMessage({
            inputMessage: inputTextForModel,
            messages: historyMessages,
            model: selectedChat.model,
            systemMessages: [
                systemMessageMapper(selectedChat.behavior),
                userWantsVoiceResponse ? systemMessageMapper(AIChatBehavior.HasAudioOutput) : null
            ],
            userId: user.id,
            tokenLimit: predictedCost.outputTokens,
            imageUrl: imageUrl,
            languageCode: sendLangToGpt ? user.lang : undefined
        });
        const responseTime = performance.now() - startTime;

        // Couldn't generate output text
        if (!res)
            return result.failed();

        resultData = res;

        const { cost, userPointCost: textGenerateUserPointCost } = modelCostCalculator({
            model: selectedChat.model,
            inputUnits: res.inputTokens,
            outputUnits: res.outputTokens,
        });

        totalUserPointUsage += textGenerateUserPointCost;
        totalRemainingPoints -= textGenerateUserPointCost;

        const savedUsageIds = await this.#userSubscriptionApplication.saveSubscriptionsUsage(textGenerateUserPointCost, subscriptions);

        await this.#promptRepository.create({
            chat: selectedChat,
            cost: cost,
            insertDate: new Date(),
            isDeleted: false,
            input: userInputText,
            output: res.output,
            points: textGenerateUserPointCost,
            model: selectedChat.model.name,
            saved: user.saveMessages,
            usages: savedUsageIds ?? [],
            promptUser: user,
            responseTime: responseTime,
            fileId: extractableFileFsId,
        });
        /* --END-- */


        const outputText = resultData.output;
        const shouldGenerateAudio = userWantsVoiceResponse && outputText.length < 500;

        if (shouldGenerateAudio) {
            const textToSpeechUserPointCost = calculatePointUsage({ usd: (outputText.length * this.#openAI.textToSpeechPmu) / 1e6 });
            if (totalRemainingPoints >= textToSpeechUserPointCost) {
                const modelAudioOutput = await this.#openAI.textToSpeech({
                    inputMessage: outputText,
                    voice: user.voiceResponse.type,
                });

                if (modelAudioOutput) {

                    totalUserPointUsage += textToSpeechUserPointCost;
                    totalRemainingPoints -= textToSpeechUserPointCost;

                    await this.#userSubscriptionApplication.saveSubscriptionsUsage(textToSpeechUserPointCost, subscriptions);

                    const duration = await getAudioDuration(modelAudioOutput.output);

                    return result.succeeded().setData({
                        pointUsage: totalUserPointUsage,
                        plainText: outputText,
                        isComplete: resultData.isComplete,
                        audio: {
                            data: modelAudioOutput.output,
                            duration: Math.round(duration && !Number.isNaN(duration) ? duration : 0),
                        },
                    });
                }

                return result.succeeded().setData({
                    plainText: outputText,
                    pointUsage: totalUserPointUsage,
                    isComplete: resultData.isComplete,
                });
            }
        }

        return result.succeeded().setData({
            pointUsage: totalUserPointUsage,
            plainText: resultData.output,
            isComplete: resultData.isComplete,
        });
    }

    public async multiModalChatCompletion(
        user: User,
        inputMessage: MultiModalInput[keyof MultiModalInput],
        messageAttachment: MultiModalInputAttachment[keyof MultiModalInputAttachment] | {},
        opts?: {
            /** Optional; Prevent double getting data and validations */
            middlewareResult?: Awaited<ReturnType<typeof AIApplication.prototype.middleware>>;
        }
    ): Promise<OperationResultWithData<MultiModalOutput>> {
        if (this.#messageLock.isLocked(user.id))
            return new OperationResultWithData<MultiModalOutput>().failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const result = await this._multiModalChatCompletion(user, inputMessage, messageAttachment, opts);

        this.#messageLock.unlock(user.id);

        return result;
    }

    async #generateAndSetChatTitle(chatId: string, message: string) {
        const result = new OperationResult();

        const freeModel = await this.#aiModelCache.getFreeModel();
        if (!freeModel)
            return result.failed("itemNotFound");

        const chat = await this.#aiChatRepository.getChat({
            id: chatId,
            isDeleted: false,
            title: "",
        });
        if (!chat)
            return result.failed("itemNotFound");

        const generatedTitleResult = await this.#openRouter.multiTextMessage({
            messages: [],
            model: freeModel,
            tokenLimit: 30,
            systemMessages: [
                "This is a message from chat, suggest a title for the chat."
            ],
            inputMessage: message,
        });

        if (!generatedTitleResult?.isComplete)
            return result.failed("errorOccurred");

        const setTitleResult = await this.#aiChatRepository.updateById({
            id: chatId,
            title: generatedTitleResult.output,
        });

        if (setTitleResult === true)
            result.succeeded();

        return result;
    }
}