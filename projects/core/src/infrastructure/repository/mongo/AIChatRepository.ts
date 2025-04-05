import type { FilterQuery, UpdateQuery } from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { UserDBModel } from "../../../types/entities/user.js";
import type { CaptionOnly } from "../../../types/contracts/entities.js";
import type { AIModelDBModel } from "../../../types/entities/aiModel.js";
import type { MongoStored, PopulatedProperty } from "./lib/model.type.js";
import type { IAIChatRepository } from "../../../types/contracts/repositories.js";
import type { AIChat, AIChatDBModel, SearchAIChat, UpdateAIChat } from "../../../types/entities/aiChat.js";

export class AIChatRepository implements IAIChatRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    #getFilter(filter: SearchAIChat) {
        const _filter: FilterQuery<MongoStored<AIChatDBModel>> = {};

        if (filter.id !== undefined)
            _filter._id = filter.id;

        if (filter.title !== undefined)
            _filter.title = filter.title;

        if (filter.isDeleted !== undefined)
            _filter.isDeleted = filter.isDeleted;

        if (filter.isHidden !== undefined)
            _filter.isHidden = filter.isHidden;

        if (filter.model !== undefined)
            _filter.model = filter.model;

        if (filter.user !== undefined)
            _filter.user = filter.user;

        if (filter.behavior !== undefined)
            _filter.behavior = filter.behavior;

        return _filter;
    }

    async create(chat: Omit<AIChatDBModel, 'id'>): Promise<AIChatDBModel['id'] | null> {
        const res = await this.#databaseConnection.models.aiChat.create({
            insertDate: chat.insertDate,
            isDeleted: chat.isDeleted,
            model: chat.model.id,
            user: chat.user.id,
            title: chat.title,
            behavior: chat.behavior,
            isHidden: chat.isHidden
        });
        return res?._id.toString() || null;
    }

    async updateById(update: UpdateAIChat): Promise<boolean | null> {
        const _update: UpdateQuery<UserDBModel> = {};

        if (update.isDeleted !== undefined)
            _update.isDeleted = update.isDeleted;

        if (update.isHidden !== undefined)
            _update.isHidden = update.isHidden;

        if (update.title !== undefined)
            _update.title = update.title;

        if (update.model !== undefined)
            _update.model = update.model;

        const res = await this.#databaseConnection.models.aiChat.updateOne({
            _id: update.id
        }, _update);

        return res.modifiedCount === 1;
    }

    async getChat(filter: SearchAIChat): Promise<Omit<AIChat, 'user'> | null> {
        const res = await this.#databaseConnection.models.aiChat.findOne(this.#getFilter(filter))
            .populate<{
                model: PopulatedProperty<AIModelDBModel>;
            }>([
                'model'
            ])
            .orFail()
            .lean();

        if (!res)
            return null;

        const model = res.model;

        return {
            id: res._id.toString(),
            title: res.title,
            isHidden: res.isHidden,
            behavior: res.behavior,
            model: {
                id: model._id.toString(),
                isDeleted: model.isDeleted,
                name: model.name,
                pricePmu: model.pricePmu,
                title: model.title,
                type: model.type,
                llmInfo: model.llmInfo,
                provider: model.provider,
            }
        };
    }

    async getChats(filter: SearchAIChat): Promise<CaptionOnly[] | null> {
        const res = await this.#databaseConnection.models.aiChat.find(this.#getFilter(filter))
            .lean();

        if (!res)
            return null;

        return res.map(item => ({ id: item._id.toString(), caption: item.title }));
    }

    async count(filter: SearchAIChat): Promise<number | null> {
        const res = await this.#databaseConnection.models.aiChat
            .countDocuments(this.#getFilter(filter));

        return res;
    }

    async exists(userId: string): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.aiChat.exists({
            user: userId,
            isDeleted: false
        });
        return Boolean(res?._id);
    }
}