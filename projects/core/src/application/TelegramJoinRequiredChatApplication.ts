import type { ServicesType } from "../Container.js";
import { OperationResult } from "../common/dto/OperationResult.js";
import type { TelegramJoinRequiredChat } from "../types/entities/telegramJoinRequiredChat.js";

export default class TelegramJoinRequiredChatApplication {
    #telegramJoinRequiredChatRepository;

    constructor(container: ServicesType) {
        this.#telegramJoinRequiredChatRepository = container.telegramJoinRequiredChatRepository;
    }

    async add(chat: Omit<TelegramJoinRequiredChat, 'id' | 'isActive'>) {
        const result = new OperationResult();

        const current = await this.#telegramJoinRequiredChatRepository.getMany({
            isDeleted: false,
            chatId: chat.chatId
        });

        if (!current)
            return result.failed();

        if (current.length > 0)
            return result.failed("chatAlreadyExists");

        if (await this.#telegramJoinRequiredChatRepository.create({
            ...chat,
            insertDate: new Date(),
            isDeleted: false,
            isActive: true
        }))
            result.succeeded();

        return result;
    }

    async getAll() {
        return await this.#telegramJoinRequiredChatRepository.getMany({
            isDeleted: false,
        }) ?? [];
    }

    async getActives() {
        return await this.#telegramJoinRequiredChatRepository.getMany({
            isActive: true,
            isDeleted: false,
        }) ?? [];
    }

    async getById(id: string) {
        return this.#telegramJoinRequiredChatRepository.getOne({
            id,
            isDeleted: false
        });
    }

    async delete(id: string) {
        const result = new OperationResult();

        if (await this.#telegramJoinRequiredChatRepository.updateOne({
            id,
            isDeleted: true
        }))
            result.succeeded();

        return result;
    }

    async activate(id: string) {
        const result = new OperationResult();

        if (await this.#telegramJoinRequiredChatRepository.updateOne({
            id,
            isActive: true
        }))
            result.succeeded();

        return result;
    }

    async deactivate(id: string) {
        const result = new OperationResult();

        if (await this.#telegramJoinRequiredChatRepository.updateOne({
            id,
            isActive: false
        }))
            result.succeeded();

        return result;
    }
}