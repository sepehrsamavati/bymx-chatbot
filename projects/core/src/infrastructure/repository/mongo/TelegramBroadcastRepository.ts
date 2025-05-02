import type { FilterQuery, UpdateQuery } from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { User } from "../../../types/entities/user.js";
import type { ITelegramBroadcastRepository } from "../../../types/contracts/repositories.js";
import type { CreateTelegramBroadcast, SearchTelegramBroadcast, TelegramBroadcast, TelegramBroadcastDBModel, UpdateTelegramBroadcast } from "../../../types/entities/telegramBroadcast.js";

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
            pendingTgIds: telegramBroadcast.pendingTgIds,
            messageId: telegramBroadcast.messageId,
            isForward: telegramBroadcast.isForward,
        });
        return Boolean(res?._id);
    }

    async getById(id: string): Promise<TelegramBroadcast | null> {
        const res = await this.#databaseConnection.models.telegramBroadcast
            .findOne({
                _id: id,
                isDeleted: false
            })
            .populate<{ admin: User; }>('admin' satisfies keyof TelegramBroadcast)
            .lean().exec();

        if (!res)
            return null;

        return {
            id: res._id.toString(),
            admin: res.admin,
            okCount: res.okCount,
            startDate: res.startDate,
            endDate: res.endDate,
            messageId: res.messageId,
            pendingTgIds: res.pendingTgIds,
            isForward: res.isForward,
        };
    }

    async getOne(filter: SearchTelegramBroadcast): Promise<TelegramBroadcast | null> {
        const _filter: FilterQuery<TelegramBroadcastDBModel> = {};

        if (filter.isDeleted !== undefined)
            _filter.isDeleted = filter.isDeleted;

        if (filter.isNull?.endDate) {
            _filter.endDate = {
                $eq: null
            };
        }

        if (filter.notNull?.endDate) {
            _filter.endDate = {
                $ne: null
            };
        }

        const res = await this.#databaseConnection.models.telegramBroadcast.findOne(_filter).populate<{ admin: User; }>('admin' satisfies keyof TelegramBroadcast).lean().exec();

        if (!res)
            return null;

        return {
            id: res._id.toString(),
            admin: res.admin,
            okCount: res.okCount,
            startDate: res.startDate,
            endDate: res.endDate,
            messageId: res.messageId,
            pendingTgIds: res.pendingTgIds,
            isForward: res.isForward,
        };
    }

    async updateById(update: UpdateTelegramBroadcast): Promise<boolean | null> {
        const _update: UpdateQuery<TelegramBroadcastDBModel> = {};

        if (update.startDate !== undefined)
            _update.startDate = update.startDate;

        if (update.endDate !== undefined)
            _update.endDate = update.endDate;

        const res = await this.#databaseConnection.models.telegramBroadcast.updateOne({
            _id: update.id,
            isDeleted: false
        }, _update);

        return res.modifiedCount === 1;
    }

    async deletePendingUser(id: string, tgId: number, increaseOkCount: boolean): Promise<boolean | null> {
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
            } : undefined)
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