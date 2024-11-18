import fs from "node:fs";
import OpenAI from "openai";
import config from "../../config.js";
import { errorLogger, logger } from "../../helpers/logger.js";
import type { UserTempFile } from "../../../../types/entities/userTempFile.js";
import type { OpenAIMessage } from "../../../../types/entities/openAIMessage.js";
import type { IOpenAIRequest, IOpenAIService, IOpenAITextResult, IOpenAITextResultWithFile } from "../../../../types/contracts/services.js";
import { getTempFilePath } from "../../helpers/storageHelper.js";
import { OperationResult } from "../../common/dto/OperationResult.js";

type IChatCompletionConfig = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

const baseChatCompletionConfig: Partial<IChatCompletionConfig> = {
    top_p: 0.2
};


export default class OpenAIService implements IOpenAIService {
    #client = new OpenAI({
        apiKey: config.openAI.apiToken
    });

    async #chatCompletion(opts: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming): Promise<IOpenAITextResult | null> {
        try {
            // const prompt = typeof opts.messages[opts.messages.length - 1].content === "string" ? opts.messages[opts.messages.length - 1].content as string : "";

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

    async multiTextMessage(opts: IOpenAIRequest) {
        const { messages, inputMessage, model, userId, systemMessage, tokenLimit } = opts;

        const _messages: IChatCompletionConfig['messages'] = [];

        if (systemMessage)
            _messages.push({ role: 'system', content: systemMessage });

        for (const message of messages) {
            _messages.push({ role: 'user', content: message.prompt });
            _messages.push({ role: 'assistant', content: message.output });
        }

        _messages.push({ role: 'user', content: inputMessage });

        return await this.#chatCompletion({
            ...baseChatCompletionConfig,
            max_completion_tokens: typeof tokenLimit === "number" && tokenLimit < 4_000 ? tokenLimit : undefined,
            model: model.name,
            user: userId,
            messages: _messages
        });
    }

    async fileSearch(opts: IOpenAIRequest & { tempFile: UserTempFile; }): Promise<IOpenAITextResultWithFile | null> {
        try {
            // const assistant = await this.#client.beta.assistants.retrieve(config.openAI.fileSearchAssistantId);

            // if (!assistant)
            //     return null;

            const { tempFile, messages, systemMessage, inputMessage, model } = opts;

            if (!model.assistants.fileSearch)
                return null;

            // Upload a file with an "assistants" purpose
            let fileId = tempFile.openAiFileId;
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
                _messages.push({ role: 'user', content: message.prompt });
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

            const vectorIds = thread.tool_resources?.file_search?.vector_store_ids ?? [];

            const threadRun = await this.#client.beta.threads.runs.createAndPoll(thread.id, {
                assistant_id: model.assistants.fileSearch,
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
                inputTokens: threadRun.usage?.prompt_tokens ?? 0,
                outputTokens: threadRun.usage?.completion_tokens ?? output.split(' ').length,
                isComplete: threadRun.status === "completed",
                output: output,
                vectorIds: vectorIds,
                fileId: fileId
            };
        } catch (err) {
            errorLogger("OpenAI service file search", err);
            return null;
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
}