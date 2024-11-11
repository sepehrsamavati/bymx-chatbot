import OpenAI from "openai";
import config from "../../config.js";
import { logger } from "../../helpers/logger.js";
import type { IOpenAIService } from "../../../../types/contracts/services.js";
import type { OpenAIMessage } from "../../../../types/entities/openAIMessage.js";

type IChatCompletionConfig = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

const baseChatCompletionConfig: Partial<IChatCompletionConfig> = {
    max_completion_tokens: 300,
    top_p: 0.2
};


export default class OpenAIService implements IOpenAIService {
    #client = new OpenAI({
        apiKey: config.openAI.apiToken
    });

    async #chatCompletion(opts: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming) {
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

                return {
                    output,
                    totalTokens: chatCompletion.usage?.total_tokens
                };
            }

            logger.warn(`Invalid response for input: ${lastMessage}`);

            return null;
        } catch (err) {
            logger.error("OpenAI chat request failed, " + (err instanceof Error ? err.message : err));
            return null;
        }
    }

    async multiTextMessage(input: string, messages: Array<Pick<OpenAIMessage, 'prompt' | 'output'>>, modelName: string, userId?: string) {
        const _messages: IChatCompletionConfig['messages'] = [];

        for (const message of messages) {
            _messages.push({ role: 'user', content: message.prompt });
            _messages.push({ role: 'assistant', content: message.output });
        }

        _messages.push({ role: 'user', content: input });

        return await this.#chatCompletion({
            ...baseChatCompletionConfig,
            model: modelName,
            user: userId,
            messages: _messages
        });
    }
}