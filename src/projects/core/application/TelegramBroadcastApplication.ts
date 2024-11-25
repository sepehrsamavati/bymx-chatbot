import type { ServicesType } from "../Container.js";
import type { User } from "../../../types/entities/user.js";
import { OperationResult } from "../common/dto/OperationResult.js";

export default class TelegramBroadcastApplication {
    #telegramBroadcastRepository;

    constructor(container: ServicesType) {
        this.#telegramBroadcastRepository = container.telegramBroadcastRepository;
    }

    async addToQueue(admin: User, messageId: number, isForward: boolean) {
        const result = new OperationResult();

        if (await this.#telegramBroadcastRepository.create({
            isForward,
            messageId,
            admin: admin.id,
            startDate: null,
            endDate: null,
            insertDate: new Date(),
            isDeleted: false,
            okCount: 0,
            pendingTgIds: []
        }))
            result.succeeded();

        return result;
    }

    async getOneUndone() {
        return await this.#telegramBroadcastRepository.getOne({
            isDeleted: false,
            notNull: {
                endDate: true // is not finished
            }
        });
    }

    async cancel(id: string) {
        const result = new OperationResult();

        if (await this.#telegramBroadcastRepository.delete(id))
            result.succeeded();

        return result;
    }

    async start(id: string) {
        const result = new OperationResult();

        if (await this.#telegramBroadcastRepository.updateById({
            id,
            startDate: new Date()
        }))
            result.succeeded();

        return result;
    }

    async removeTgIdFromQueue(broadcastId: string, tgId: number, wasSuccessful: boolean) {
        const result = new OperationResult();

        if (await this.#telegramBroadcastRepository.deletePendingUser(broadcastId, tgId, wasSuccessful))
            result.succeeded();

        return result;
    }

    async finish(id: string) {
        const result = new OperationResult();

        if (await this.#telegramBroadcastRepository.updateById({
            id,
            endDate: new Date()
        }))
            result.succeeded();

        return result;
    }
}