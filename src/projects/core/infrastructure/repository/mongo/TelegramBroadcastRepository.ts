import type { ServicesType } from "../../../Container.js";
import type { User } from "../../../../../types/entities/user.js";
import type { CreateTelegramBroadcast } from "../../../../../types/entities/telegramBroadcast.js";
import type { ITelegramBroadcastRepository } from "../../../../../types/contracts/repositories.js";

export class TelegramBroadcastRepository implements ITelegramBroadcastRepository {
    #databaseConnection;

    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(telegramBroadcast: CreateTelegramBroadcast): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.telegramBroadcast.create({
            insertDate: telegramBroadcast.insertDate,
            isDeleted: telegramBroadcast.isDeleted,
            admin: telegramBroadcast.admin,
            startDate: telegramBroadcast.startDate,
            endDate: telegramBroadcast.endDate,
            okCount: telegramBroadcast.okCount,
            pendingTgIds: telegramBroadcast.pendingTgIds
        });
        return Boolean(res?._id);
    }

    async deletePendingUser(id: string, tgId: User["tgId"], increaseOkCount: boolean): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.telegramBroadcast.updateOne({
            _id: id,
            isDeleted: false,
        }, {
            $pull: {
                pendingTgIds: tgId
            },
            ...(increaseOkCount ? {
                $inc: {
                    okCount: 1
                }
            } : {})
        });

        return Boolean(res.modifiedCount !== 0);
    }

    async delete(id: string): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.telegramBroadcast.updateOne({
            _id: id,
            isDeleted: false,
        }, {
            isDeleted: true
        });

        return Boolean(res.modifiedCount === 1);
    }
}