import fs from "node:fs";
import OpenAI from "openai";
import config from "../../config.js";
import { HttpsProxyAgent } from 'https-proxy-agent';
import { errorLogger, logger } from "../../helpers/logger.js";
import { getTempFilePath } from "../../helpers/storageHelper.js";
import { OperationResult } from "../../common/dto/OperationResult.js";
import type { UserTempFile } from "../../types/entities/userTempFile.js";
import type { IOpenAIAudioResult, IOpenAIRequest, IOpenAIService, IOpenAISpeechToTextRequest, IOpenAISpeechToTextResult, IOpenAITextResult, IOpenAITextResultWithFile, IOpenAITextToSpeechRequest } from "../../types/contracts/services.js";

type IChatCompletionConfig = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

const baseChatCompletionConfig: Partial<IChatCompletionConfig> = {
    top_p: 0.2
};


export default class OpenAIService implements IOpenAIService {
    #client = new OpenAI({
        apiKey: config.openAI.apiToken,
        httpAgent: config.httpProxyUri ? new HttpsProxyAgent(config.httpProxyUri) : undefined,
    });

    async #chatCompletion(opts: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming): Promise<IOpenAITextResult | null> {
        try {
            const chatCompletion = await this.#client.chat.completions.create(opts);

            const lastMessage = opts.messages[opts.messages.length - 1]?.content;

            if (chatCompletion.choices.length !== 1) {
                logger.warn(`Multiple choices retorted for input: ${lastMessage}`);
                return null;
            }

            const choice = chatCompletion.choices.at(0);
            const result = choice?.message;

            if (result?.content?.length && result?.role === "assistant") {
                const output = result.content;

                if (!chatCompletion.usage)
                    logger.warn("OpenAI chat completion usage not available!");

                return {
                    output,
                    isComplete: choice?.finish_reason === "stop",
                    inputTokens: chatCompletion.usage?.prompt_tokens ?? opts.messages.map(msg => (msg.content as string)?.split(' ').length).reduce((a, b) => a + b, 0),
                    outputTokens: chatCompletion.usage?.completion_tokens ?? output.split(' ').length,
                };
            }

            logger.warn(`Invalid response for input: ${lastMessage}`);

            return null;
        } catch (err) {
            logger.error("OpenAI chat request failed, " + (err instanceof Error ? err.message : err));
            return null;
        }
    }

    // async #audioChatCompletion(opts: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming): Promise<IOpenAIAudioResult | null> {
    //     try {
    //         const chatCompletion = await this.#client.chat.completions.create(opts);

    //         const choice = chatCompletion.choices.at(0);
    //         const result = choice?.message;

    //         if (result?.audio && result?.role === "assistant") {
    //             const output = result.audio.data;

    //             debugger

    //             if (!chatCompletion.usage)
    //                 logger.warn("OpenAI chat completion usage not available!");

    //             return {
    //                 output,
    //                 isComplete: choice?.finish_reason === "stop",
    //                 inputTokens: chatCompletion.usage?.prompt_tokens ?? opts.messages.map(msg => (msg.content as string)?.split(' ').length).reduce((a, b) => a + b, 0),
    //                 outputTokens: chatCompletion.usage?.completion_tokens ?? output.split(' ').length,
    //             };
    //         }

    //         return null;
    //     } catch (err) {
    //         logger.error("OpenAI audio chat request failed, " + (err instanceof Error ? err.message : err));
    //         return null;
    //     }
    // }

    async multiTextMessage(opts: IOpenAIRequest) {
        const { messages, inputMessage, model, userId, tokenLimit, imageUrl, languageCode } = opts;
        let systemMessages = opts.systemMessages ?? [];

        const _messages: IChatCompletionConfig['messages'] = [];

        if (languageCode)
            systemMessages.push(`User language: '${languageCode}'`);

        const _systemMessage = systemMessages.filter(msg => Boolean(msg)).join('. ') ?? "";

        if (_systemMessage)
            _messages.push({ role: 'system', content: _systemMessage });

        for (const message of messages) {
            _messages.push({ role: 'user', content: message.input });
            _messages.push({ role: 'assistant', content: message.output });
        }

        if (imageUrl)
            _messages.push({
                role: 'user',
                content: [
                    {
                        type: "text",
                        text: inputMessage
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": imageUrl
                        }
                    }
                ]
            });
        else
            _messages.push({ role: 'user', content: inputMessage });

        return await this.#chatCompletion({
            ...baseChatCompletionConfig,
            max_completion_tokens: typeof tokenLimit === "number" && tokenLimit < 4_000 ? tokenLimit : undefined,
            model: model.name,
            user: userId,
            messages: _messages
        });
    }

    /** Price per million units (input text characters) */
    readonly textToSpeechPmu = 15;
    async textToSpeech(opts: IOpenAITextToSpeechRequest): Promise<IOpenAIAudioResult | null> {
        try {
            const result = await this.#client.audio.speech.create({
                input: opts.inputMessage,
                model: "tts-1",
                voice: opts.voice,
                response_format: "mp3",
            });

            const buffer = Buffer.from(await result.arrayBuffer());

            return {
                output: buffer,
            };
        } catch (err) {
            errorLogger("OpenAI text to speech", err);
            return null;
        }
    }

    /** Price per million units (input audio seconds) */
    readonly speechToTextPmu = 100;
    async speechToText(opts: IOpenAISpeechToTextRequest): Promise<IOpenAISpeechToTextResult | null> {
        try {
            const result = await this.#client.audio.transcriptions.create({
                file: fs.createReadStream(opts.inputAudioPath),
                model: "whisper-1",
                language: opts.language,
                prompt: opts.prompt,
                response_format: "verbose_json",
            });

            return {
                duration: Math.ceil(Number.parseInt(result.duration) || 20),
                output: result.text,
            };
        } catch (err) {
            errorLogger("OpenAI speech to text", err);
            return null;
        }
    }

    async fileSearch(opts: IOpenAIRequest & { tempFile: UserTempFile; }): Promise<IOpenAITextResultWithFile> {
        let fileId: string | undefined = undefined;
        let vectorIds: string[] | undefined = undefined;
        try {
            const { tempFile, messages, inputMessage, model, languageCode } = opts;

            if (!model.assistants.fileSearch)
                return { file: {} };

            // Upload a file with an "assistants" purpose
            fileId = tempFile.openAiFileId;
            if (!fileId) {
                const filePath = getTempFilePath(tempFile);
                const file = await this.#client.files.create({
                    file: fs.createReadStream(filePath),
                    purpose: "assistants",
                });
                fileId = file.id;
            }

            const _messages: OpenAI.Beta.Threads.ThreadCreateAndRunParams.Thread.Message[] = [];

            for (const message of messages) {
                _messages.push({ role: 'user', content: message.input });
                _messages.push({ role: 'assistant', content: message.output });
            }

            _messages.push({
                role: 'user',
                content: inputMessage,
                attachments: [
                    {
                        file_id: fileId,
                        tools: [{ type: "file_search" }]
                    }
                ]
            });

            const thread = await this.#client.beta.threads.create({
                messages: _messages,
                tool_resources: tempFile.vectorIds.length ? {
                    file_search: {
                        vector_store_ids: tempFile.vectorIds
                    }
                } : undefined
            });

            vectorIds = thread.tool_resources?.file_search?.vector_store_ids ?? [];

            let systemMessages = opts.systemMessages ?? [];
            if (languageCode)
                systemMessages.push(`User language: '${languageCode}'`);
            const _systemMessage = systemMessages.filter(msg => Boolean(msg)).join('. ') ?? "";

            const threadRun = await this.#client.beta.threads.runs.createAndPoll(thread.id, {
                assistant_id: model.assistants.fileSearch,
                instructions: _systemMessage || undefined,
                tools: [{ "type": "file_search" }],
            });

            const threadMessages = await this.#client.beta.threads.messages.list(thread.id, {
                run_id: threadRun.id,
            });

            const content = threadMessages.data[0].content[0];
            let output = "ERROR";

            if (content.type === "text") {
                output = content.text.value;
                for (const annotation of content.text.annotations) {
                    output = output.replace(annotation.text, "");
                }
            }

            const threadDeleteResult = await this.#client.beta.threads.del(thread.id);
            if (!threadDeleteResult.deleted) {
                logger.error(`Delete file search thread failed! / ThreadId: ${thread.id} / RqId: ${threadDeleteResult._request_id}`);
            }

            return {
                result: {
                    inputTokens: threadRun.usage?.prompt_tokens ?? 0,
                    outputTokens: threadRun.usage?.completion_tokens ?? output.split(' ').length,
                    isComplete: threadRun.status === "completed",
                    output: output,
                },
                file: {
                    vectorIds: vectorIds,
                    fileId: fileId
                }
            };
        } catch (err) {
            errorLogger("OpenAI service file search", err);
            return {
                file: {
                    vectorIds, fileId
                }
            };
        }
    }

    async deleteFileById(id: string): Promise<OperationResult> {
        const result = new OperationResult().failed();

        try {
            const res = await this.#client.files.del(id);

            if (res.deleted)
                result.succeeded();
        } catch (err) {
            errorLogger("OpenAI service error on deleting file", err);
        }

        return result;
    }

    async deleteVectorById(id: string): Promise<OperationResult> {
        const result = new OperationResult().failed();

        try {
            const res = await this.#client.beta.vectorStores.del(id);

            if (res.deleted)
                result.succeeded();
        } catch (err) {
            errorLogger("OpenAI service error on deleting vector", err);
        }

        return result;
    }

    async simpleImageGenerate(userId: string | undefined, prompt: string) {
        try {
            const res = await this.#client.images.generate({
                model: "dall-e-2",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                response_format: "url",
                user: userId
            });

            if (res.data.length) {
                const url = res.data.at(0)?.url;
                if (!url)
                    return null;
                return {
                    url,
                    costUsdCent: 2
                };
            } else {
                logger.warn(`Invalid OpenAI image generate result for prompt ('${prompt}')`);
            }

            return null;
        } catch (err) {

            if (err instanceof Error) {
                if ('code' in err && err.code === 'content_policy_violation')
                    return {
                        costUsdCent: 0,
                        contentPolicyViolation: true,
                    };
            }

            errorLogger("OpenAI simpleImageGenerate", err);
            return null;
        }
    }
}