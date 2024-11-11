import { CreateOpenAIChat } from "../../../types/entities/openAIChat.js";
import type { ServicesType } from "../Container.js";

export default class OpenAIChatApplication {
    #openAIChatRepository;

    constructor(container: ServicesType) {
        this.#openAIChatRepository = container.openAIChatRepository;
    }

    async create(chat: CreateOpenAIChat) {
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
}