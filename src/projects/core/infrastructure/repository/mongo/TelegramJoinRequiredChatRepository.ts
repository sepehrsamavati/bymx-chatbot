import type { FilterQuery, UpdateQuery } from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { ITelegramJoinRequiredChatRepository } from "../../../../../types/contracts/repositories.js";
import type { CreateTelegramJoinRequiredChat, TelegramJoinRequiredChat, SearchTelegramJoinRequiredChat, UpdateTelegramJoinRequiredChat } from "../../../../../types/entities/telegramJoinRequiredChat.js";

export class TelegramJoinRequiredChatRepository implements ITelegramJoinRequiredChatRepository {
    #databaseConnection;

    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(chat: CreateTelegramJoinRequiredChat): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.telegramJoinRequiredChat.create(chat);
        return Boolean(typeof res?._id !== "string");
    }

    async getOne(filter: SearchTelegramJoinRequiredChat): Promise<TelegramJoinRequiredChat | null> {
        const _filter: FilterQuery<TelegramJoinRequiredChat> = {};

        if (filter.id !== undefined)
            _filter._id = filter.id;

        if (filter.chatId !== undefined)
            _filter.chatId = filter.chatId;

        if (filter.isActive !== undefined)
            _filter.isActive = filter.isActive;

        if (filter.isDeleted !== undefined)
            _filter.isDeleted = filter.isDeleted;

        const res = await this.#databaseConnection.models.telegramJoinRequiredChat
            .findOne(_filter)
            .lean()
            .exec();

        return res ? {
            id: res._id.toString(),
            chatId: res.chatId,
            isActive: res.isActive,
            link: res.link,
            title: res.title,
        } : null;
    }

    async getMany(filter: SearchTelegramJoinRequiredChat): Promise<TelegramJoinRequiredChat[] | null> {
        const _filter: FilterQuery<TelegramJoinRequiredChat> = {};

        if (filter.id !== undefined)
            _filter._id = filter.id;

        if (filter.chatId !== undefined)
            _filter.chatId = filter.chatId;

        if (filter.isActive !== undefined)
            _filter.isActive = filter.isActive;

        if (filter.isDeleted !== undefined)
            _filter.isDeleted = filter.isDeleted;

        const res = await this.#databaseConnection.models.telegramJoinRequiredChat
            .find(_filter)
            .lean()
            .exec();

        return res ? res.map(item => ({
            id: item._id.toString(),
            chatId: item.chatId,
            isActive: item.isActive,
            link: item.link,
            title: item.title,
        })) : null;
    }

    async updateOne(update: UpdateTelegramJoinRequiredChat): Promise<boolean | null> {
        const _update: UpdateQuery<TelegramJoinRequiredChat> = {};

        if (update.isActive !== undefined)
            _update.isActive = update.isActive;

        if (update.isDeleted !== undefined)
            _update.isDeleted = update.isDeleted;

        const res = await this.#databaseConnection.models.telegramJoinRequiredChat.updateOne({
            id: update.id
        }, _update);

        return Boolean(res.matchedCount === 1);
    }
}
