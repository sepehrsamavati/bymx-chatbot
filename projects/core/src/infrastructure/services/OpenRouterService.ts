import OpenAI from "openai";
import { ProxyAgent } from "undici";
import config from "../../config.js";
import { logger } from "../../helpers/logger.js";
import { isChatCompletionStream } from "../../helpers/isStream.js";
import type { IOpenAIRequest, IOpenAITextResult, IOpenRouterService, StreamingChatResponseReader } from "../../types/contracts/services.js";

type IChatCompletionConfig = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

export default class OpenRouterService implements IOpenRouterService {
    #client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: config.openRouter.apiToken,
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

                if (!Array.isArray(chatCompletion.choices)) {
                    debugger
                    return null;
                }

                const lastMessage = opts.messages[opts.messages.length - 1]?.content;

                if (chatCompletion.choices.length !== 1) {
                    logger.warn(`Multiple choices generated for input: ${lastMessage}`);
                    return null;
                }

                const choice = chatCompletion.choices.at(0);
                const result = choice?.message;

                if (result?.content?.length && result?.role === "assistant") {
                    const output = result.content;

                    if (!chatCompletion.usage)
                        logger.warn("OpenRouter chat completion usage not available!");

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
            logger.error("OpenRouter chat request failed, " + (err instanceof Error ? err.message : err));
            return null;
        }
    }

    async multiTextMessage(opts: IOpenAIRequest) {
        const { messages, inputMessage, model, userId, tokenLimit, imageUrl, languageCode } = opts;
        let systemMessages = opts.systemMessages ?? [];

        const _messages: IChatCompletionConfig['messages'] = [];

        if (languageCode)
            systemMessages.push(`User language: '${languageCode}'`);

        const _systemMessage = systemMessages.filter(msg => Boolean(msg)).join('. ') ?? "";

        // if (_systemMessage)
        //     _messages.push({ role: 'system', content: _systemMessage });

        for (const message of messages) {
            _messages.push({ role: 'user', content: message.input });
            _messages.push({ role: 'assistant', content: message.output });
        }

        // if (imageUrl)
        //     _messages.push({
        //         role: 'user',
        //         content: [
        //             {
        //                 type: "text",
        //                 text: inputMessage
        //             },
        //             {
        //                 "type": "image_url",
        //                 "image_url": {
        //                     "url": imageUrl
        //                 }
        //             }
        //         ]
        //     });
        // else
        _messages.push({ role: 'user', content: _systemMessage ? `System message: ${_systemMessage};\nUser message: ${inputMessage}` : inputMessage });

        const baseChatCompletionConfig: Partial<IChatCompletionConfig> = {};

        // if (model.name.startsWith('gpt'))
        //     baseChatCompletionConfig.top_p = 0.2;

        return await this.#chatCompletion({
            ...baseChatCompletionConfig,
            max_completion_tokens: typeof tokenLimit === "number" && tokenLimit < model.llmInfo.maxOutputTokens ? tokenLimit : undefined,
            model: model.name,
            user: userId,
            messages: _messages
        }, opts.model.llmInfo.canStream ? opts.streamReader : undefined);
    }
}