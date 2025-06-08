import config from "../config.js";
import type { ServicesType } from "../Container.js";
import stringHelper from "../helpers/stringHelper.js";
import type { User } from "../types/entities/user.js";
import { AIModelType } from "../types/enums/aiModelType.js";
import type { PromptViewModel } from "../types/entities/prompt.js";
import type { CreateAIChat, AIChat } from "../types/entities/aiChat.js";
import { OperationResult, OperationResultWithData } from "../common/dto/OperationResult.js";

export default class AIChatApplication {
    #aiModelCache;
    #userApplication;
    #promptRepository;
    #aiChatRepository;
    #aiModelApplication;

    constructor(container: ServicesType) {
        this.#aiModelCache = container.aiModelCache;
        this.#userApplication = container.userApplication;
        this.#promptRepository = container.promptRepository;
        this.#aiChatRepository = container.aiChatRepository;
        this.#aiModelApplication = container.aiModelApplication;
    }

    async create(chat: CreateAIChat) {
        const result = new OperationResultWithData<string>();

        if (chat.model.type !== AIModelType.Text)
            return result.failed("invalidInput");

        const canCreateNewChat = await this.canCreateNewChat(chat.user.id);

        if (!canCreateNewChat.ok)
            return result.failed("reachedDailyChatCountLimit");

        const createdChatId = await this.#aiChatRepository.create({
            insertDate: new Date(),
            isDeleted: false,
            isHidden: chat.isHidden,
            model: chat.model,
            title: chat.title,
            user: chat.user,
            behavior: chat.behavior
        });

        if (createdChatId)
            result.succeeded().setData(createdChatId);

        return result;
    }

    async deleteByUser(user: User, chatId: string) {
        const result = new OperationResult().failed();

        const chat = await this.#aiChatRepository.getChat({ id: chatId, isDeleted: false, user: user.id });

        if (!chat)
            return result;

        if (user.telegram?.selectedChat?.id === chatId) {
            const unsetUserSelectedChat = await this.#userApplication.setUserSelectedChatById(user, null);

            if (!unsetUserSelectedChat.ok)
                return result;

            user.telegram.selectedChat = undefined;
        }

        const deleted = await this.#aiChatRepository.updateById({
            id: chatId,
            isDeleted: true,
        });

        if (deleted)
            result.succeeded();

        return result;
    }

    async setTitle(chatId: string, title: string) {
        const result = new OperationResult().failed();

        const updated = await this.#aiChatRepository.updateById({
            id: chatId,
            title: title
        });

        if (updated === true)
            result.succeeded();

        return result;
    }

    async setModel(chat: AIChat, modelId: string) {
        const result = new OperationResult().failed();

        const _model = await this.#aiModelApplication.getById(modelId);

        if (!_model)
            return result.failed();

        if (modelId === chat.model.id)
            return result.succeeded();

        if (_model.type !== AIModelType.Text)
            return result.failed();

        const updated = await this.#aiChatRepository.updateById({
            id: chat.id,
            model: _model.id
        });

        if (updated === true)
            result.succeeded();

        return result;
    }

    async getUserChatById(userId: string, chatId: string) {
        const chat = await this.#aiChatRepository.getChat({
            isDeleted: false,
            isHidden: false,
            id: chatId,
            user: userId
        });
        return chat;
    }

    /**
     * 
     * @param userId 
     * @param cursorChatId Get chats after this chat as cursor
     * @returns 
     */
    async getVisibleChats(userId: string, cursorChatId?: string) {
        const chats = await this.#aiChatRepository.getChats({
            user: userId,
            isDeleted: false,
            isHidden: false,
        }, {
            count: 5,
            afterId: cursorChatId,
        });
        return chats;
    }

    async canCreateNewChat(userId: string) {
        const result = new OperationResult();

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const currentChatsCount = await this.#aiChatRepository.count({
            user: userId,
            isDeleted: false,
            isHidden: false,
            insertDate: {
                after: yesterday,
            }
        });

        if (currentChatsCount === null)
            return result.failed("errorOccurred");

        if (currentChatsCount >= config.dailyChatCountLimit)
            return result.failed("reachedDailyChatCountLimit");

        return result.succeeded();
    }

    async clearPromptHistory(chatId: string) {
        const result = new OperationResult();

        if (await this.#promptRepository.deleteByChatId(chatId))
            result.succeeded("chatMessagesCleared");

        return result;
    }

    async clearUserSelectedChatHistory(user: User) {
        const result = new OperationResult();

        if (!user.telegram?.selectedChat)
            return result.failed("selectChatBeforeUse");

        return this.clearPromptHistory(user.telegram.selectedChat.id);
    }

    async getLastMessages(chatId: string, beforeMessageId: string | undefined, count: number) {
        const result = new OperationResultWithData<PromptViewModel[]>();

        const prompts = await this.#promptRepository.getRecentHistory(chatId, count, beforeMessageId);

        if (prompts)
            result
                .succeeded()
                .setData(
                    prompts
                        .map(
                            p => (
                                {
                                    id: p.id,
                                    inputDate: Number.parseInt((p.date - p.responseTime).toString()) || 0,
                                    outputDate: p.date,
                                    modelTitle: this.#aiModelCache.getModelByName(p.model)?.title || stringHelper.modelNameToTitle(p.model),
                                    input: p.input,
                                    output: p.output,
                                    points: p.points,
                                }
                            )
                        )
                );

        return result;
    }

    async deleteMessagesAfter(chatId: string, messageId: string) {
        const result = new OperationResult();

        const ok = await this.#promptRepository.deleteAfter(chatId, messageId);

        if (ok)
            result
                .succeeded();

        return result;
    }
}