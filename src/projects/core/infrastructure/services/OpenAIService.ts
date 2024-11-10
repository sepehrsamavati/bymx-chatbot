import OpenAI from "openai";
import config from "../../config.js";
import { logger } from "../../helpers/logger.js";
import type { IOpenAIService } from "../../../../types/contracts/services.js";

type IChatCompletionConfig = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

const baseChatCompletionConfig: Partial<IChatCompletionConfig> & Pick<IChatCompletionConfig, 'model'> = {
    model: 'gpt-3.5-turbo',
    max_completion_tokens: 300,
    user: undefined,
    top_p: 0.2
};


export default class OpenAIService implements IOpenAIService {
    #client = new OpenAI({
        apiKey: config.openAI.apiToken
    });

    async simpleMessage(input: string, userId?: string) {

        try {
            const messages: IChatCompletionConfig['messages'] = [{ role: 'user', content: input }];

            const chatCompletion = await this.#client.chat.completions.create({
                ...baseChatCompletionConfig,
                user: userId,
                messages
            });

            if (chatCompletion.choices.length !== 1) {
                logger.warn(`Multiple choices retorted for input: ${input}`);
                return null;
            }

            const choice = chatCompletion.choices.at(0);
            const result = choice?.message;

            if (result?.content?.length && result?.role === "assistant") {
                const output = result.content;

                return output;
            }

            logger.warn(`Invalid response for input: ${input}`);

            return null;
        } catch (err) {
            logger.error("OpenAI chat request failed, " + (err instanceof Error ? err.message : err));
            return null;
        }
    }
}