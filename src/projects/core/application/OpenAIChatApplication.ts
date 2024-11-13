import type { ServicesType } from "../Container.js";
import { OperationResult } from "../common/dto/OperationResult.js";
import { CreateOpenAIChat } from "../../../types/entities/openAIChat.js";
import config from "../config.js";

export default class OpenAIChatApplication {
    #openAIChatRepository;

    constructor(container: ServicesType) {
        this.#openAIChatRepository = container.openAIChatRepository;
    }

    async create(chat: CreateOpenAIChat) {
        const canCreateNewChat = await this.canCreateNewChat(chat.user.id);

        if (!canCreateNewChat.ok)
            return null;

        const createdChatId = await this.#openAIChatRepository.create({
            insertDate: new Date(),
            isDeleted: false,
            isHidden: chat.isHidden,
            model: chat.model,
            title: chat.title,
            user: chat.user
        });
        return createdChatId;
    }

    async setTitle(chatId: string, title: string) {
        const result = new OperationResult().failed();

        const updated = await this.#openAIChatRepository.updateById({
            id: chatId,
            title: title
        });

        if (updated === true)
            result.succeeded();

        return result;
    }

    async getUserChatById(userId: string, chatId: string) {
        const createdChatId = await this.#openAIChatRepository.getChat({
            isDeleted: false,
            isHidden: false,
            id: chatId,
            user: userId
        });
        return createdChatId;
    }

    async getVisibleChats(userId: string) {
        const chats = await this.#openAIChatRepository.getChats({
            user: userId,
            isDeleted: false,
            isHidden: false,
        });
        return chats;
    }

    async canCreateNewChat(userId: string) {
        const result = new OperationResult();

        const currentChatsCount = await this.#openAIChatRepository.count({
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