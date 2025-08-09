import fs from "node:fs";
import OpenAI from "openai";
import { ProxyAgent } from "undici";
import config from "../../config.js";
import { errorLogger, logger } from "../../helpers/logger.js";
import { isChatCompletionStream } from "../../helpers/isStream.js";
import { OperationResult } from "../../common/dto/OperationResult.js";
import type { IOpenAIAudioResult, IOpenAIRequest, IOpenAIService, IOpenAISpeechToTextRequest, IOpenAISpeechToTextResult, IOpenAITextResult, IOpenAITextToSpeechRequest, StreamingChatResponseReader } from "../../types/contracts/services.js";

type IChatCompletionConfig = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

export default class OpenAIService implements IOpenAIService {
    #client = new OpenAI({
        apiKey: config.openAI.apiToken,
        maxRetries: config.openAiClient.retries,
        timeout: config.openAiClient.timeout,
        fetchOptions: {
            dispatcher: config.httpProxyUri ? new ProxyAgent(config.httpProxyUri) : undefined
        }
    });

    async #streamChatCompletion(opts: OpenAI.Chat.ChatCompletionCreateParams, streamReader: StreamingChatResponseReader) {
        opts.stream = true;

        const stream = await this.#client.chat.completions.create(opts);

        if (!isChatCompletionStream(stream)) {
            throw new Error("Expected a stream, but received a full completion.");
        }

        let fullOutput = "",
            latestFinishReason = "",
            latestUsage: OpenAI.Completions.CompletionUsage | null = null;

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;

            latestFinishReason = chunk.choices.at(0)?.finish_reason || latestFinishReason;

            if (chunk.usage) {
                if (latestUsage)
                    logger.warn("Multiple chunks having usage?!");
                latestUsage = chunk.usage;
            }

            if (content) {
                streamReader(content, false);
                fullOutput += content;
            }
        }

        streamReader("", true);

        return {
            fullOutput,
            usage: latestUsage,
            latestFinishReason,
        };
    }

    async #chatCompletion(opts: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, streamReader?: StreamingChatResponseReader): Promise<IOpenAITextResult | null> {
        try {
            const defaultInputTokens = opts.messages.map(msg => (msg.content as string)?.split(' ').length).reduce((a, b) => a + b, 0);

            if (streamReader) {
                const streamResult = await this.#streamChatCompletion(opts, streamReader);
                const output = streamResult.fullOutput;
                return {
                    output,
                    isComplete: streamResult.latestFinishReason === "stop",
                    inputTokens: streamResult.usage?.prompt_tokens ?? defaultInputTokens,
                    outputTokens: streamResult.usage?.completion_tokens ?? output.split(' ').length,
                };
            } else {

                const chatCompletion = await this.#client.chat.completions.create(opts);

                const lastMessage = opts.messages[opts.messages.length - 1]?.content;

                if (chatCompletion.choices.length < 1) {
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
                        inputTokens: chatCompletion.usage?.prompt_tokens ?? defaultInputTokens,
                        outputTokens: chatCompletion.usage?.completion_tokens ?? output.split(' ').length,
                    };
                }
                logger.warn(`Invalid response for input: ${lastMessage}`);
            }

            return null;
        } catch (err) {
            logger.error("OpenAI chat request failed, " + (err instanceof Error ? err.message : err));
            return null;
        }
    }

    async multiTextMessage(opts: IOpenAIRequest) {
        const { messages, inputMessage, model, userId, tokenLimit, imageUrl, languageCode } = opts;
        const isGpt = model.name.startsWith('gpt');
        const isGpt5 = model.name.startsWith('gpt-5-');
        const modelHasTopP = isGpt && !isGpt5;
        let systemMessages = opts.systemMessages ?? [];

        const _messages: IChatCompletionConfig['messages'] = [];

        if (languageCode)
            systemMessages.push(`User language: '${languageCode}'`);

        const _systemMessage = systemMessages.filter(msg => Boolean(msg)).join('. ') ?? "";

        if (_systemMessage && isGpt)
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

        const baseChatCompletionConfig: Partial<IChatCompletionConfig> = {};

        if (modelHasTopP)
            baseChatCompletionConfig.top_p = 0.2;

        return await this.#chatCompletion({
            ...baseChatCompletionConfig,
            max_completion_tokens: typeof tokenLimit === "number" && tokenLimit < model.llmInfo.maxOutputTokens ? tokenLimit : undefined,
            model: model.name,
            user: userId,
            messages: _messages
        }, opts.model.llmInfo.canStream ? opts.streamReader : undefined);
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
                duration: Math.ceil(Number.parseInt(result.duration as unknown as string) || 20),
                output: result.text,
            };
        } catch (err) {
            errorLogger("OpenAI speech to text", err);
            return null;
        }
    }

    async deleteFileById(id: string): Promise<OperationResult> {
        const result = new OperationResult().failed();

        try {
            const res = await this.#client.files.delete(id);

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
            const res = await this.#client.vectorStores.delete(id);

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

            if (res.data?.length) {
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