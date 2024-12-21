import config from "../config.js";
import type { ServicesType } from "../Container.js";
import { User } from "../../../types/entities/user.js";
import { OperationResult } from "../common/dto/OperationResult.js";
import { CreateAIChat, AIChat } from "../../../types/entities/aiChat.js";

export default class AIChatApplication {
    #userApplication;
    #aiChatRepository;
    #aiModelApplication;

    constructor(container: ServicesType) {
        this.#userApplication = container.userApplication;
        this.#aiChatRepository = container.aiChatRepository;
        this.#aiModelApplication = container.aiModelApplication;
    }

    async create(chat: CreateAIChat) {
        const canCreateNewChat = await this.canCreateNewChat(chat.user.id);

        if (!canCreateNewChat.ok)
            return null;

        const createdChatId = await this.#aiChatRepository.create({
            insertDate: new Date(),
            isDeleted: false,
            isHidden: chat.isHidden,
            model: chat.model,
            title: chat.title,
            user: chat.user,
            behavior: chat.behavior
        });
        return createdChatId;
    }

    async deleteByUser(user: User, chatId: string) {
        const result = new OperationResult().failed();

        const chat = await this.#aiChatRepository.getChat({ id: chatId, isDeleted: false, user: user.id });

        if (!chat)
            return result;

        if (user.selectedChat?.id === chatId) {
            const unsetUserSelectedChat = await this.#userApplication.setUserSelectedChatById(user, null);

            if (!unsetUserSelectedChat.ok)
                return result;

            user.selectedChat = undefined;
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
        const createdChatId = await this.#aiChatRepository.getChat({
            isDeleted: false,
            isHidden: false,
            id: chatId,
            user: userId
        });
        return createdChatId;
    }

    async getVisibleChats(userId: string) {
        const chats = await this.#aiChatRepository.getChats({
            user: userId,
            isDeleted: false,
            isHidden: false,
        });
        return chats;
    }

    async canCreateNewChat(userId: string) {
        const result = new OperationResult();

        const currentChatsCount = await this.#aiChatRepository.count({
            user: userId,
            isDeleted: false,
            isHidden: false,
        });

        if (currentChatsCount === null)
            return result.failed("errorOccurred");

        if (currentChatsCount >= config.chatCountLimit)
            return result.failed("reachedChatCountLimit");

        return result.succeeded();
    }
}