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
}