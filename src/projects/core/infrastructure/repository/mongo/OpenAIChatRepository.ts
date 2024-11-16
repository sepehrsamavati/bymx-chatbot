import type { FilterQuery, UpdateQuery } from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { UserDBModel } from "../../../../../types/entities/user.js";
import type { MongoStored, PopulatedProperty } from "./lib/model.type.js";
import type { CaptionOnly } from "../../../../../types/contracts/entities.js";
import type { OpenAIModelDBModel } from "../../../../../types/entities/openAIModel.js";
import type { IOpenAIChatRepository } from "../../../../../types/contracts/repositories.js";
import type { OpenAIChat, OpenAIChatDBModel, SearchOpenAIChat, UpdateOpenAIChat } from "../../../../../types/entities/openAIChat.js";

export class OpenAIChatRepository implements IOpenAIChatRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    #getFilter(filter: SearchOpenAIChat) {
        const _filter: FilterQuery<MongoStored<OpenAIChatDBModel>> = {};

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

        return _filter;
    }

    async create(chat: Omit<OpenAIChatDBModel, 'id'>): Promise<OpenAIChatDBModel['id'] | null> {
        const res = await this.#databaseConnection.models.openAIChat.create({
            insertDate: chat.insertDate,
            isDeleted: chat.isDeleted,
            model: chat.model.id,
            user: chat.user.id,
            title: chat.title,
            isHidden: chat.isHidden
        });
        return res?._id.toString() || null;
    }

    async updateById(update: UpdateOpenAIChat): Promise<boolean | null> {
        const _update: UpdateQuery<UserDBModel> = {};

        if (update.isDeleted !== undefined)
            _update.isDeleted = update.isDeleted;

        if (update.isHidden !== undefined)
            _update.isHidden = update.isHidden;

        if (update.title !== undefined)
            _update.title = update.title;

        if (update.model !== undefined)
            _update.model = update.model;

        const res = await this.#databaseConnection.models.openAIChat.updateOne({
            _id: update.id
        }, _update);

        return res.modifiedCount === 1;
    }

    async getChat(filter: SearchOpenAIChat): Promise<Omit<OpenAIChat, 'user'> | null> {
        const res = await this.#databaseConnection.models.openAIChat.findOne(this.#getFilter(filter))
            .populate<{
                model: PopulatedProperty<OpenAIModelDBModel>;
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
            model: {
                id: model._id.toString(),
                name: model.name,
                pricePmu: model.pricePmu,
                title: model.title,
                type: model.type
            }
        };
    }

    async getChats(filter: SearchOpenAIChat): Promise<CaptionOnly[] | null> {
        const res = await this.#databaseConnection.models.openAIChat.find(this.#getFilter(filter))
            .lean();

        if (!res)
            return null;

        return res.map(item => ({ id: item._id.toString(), caption: item.title }));
    }

    async count(filter: SearchOpenAIChat): Promise<number | null> {
        const res = await this.#databaseConnection.models.openAIChat
            .countDocuments(this.#getFilter(filter));

        return res;
    }

    async exists(userId: string): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.openAIChat.exists({
            user: userId,
            isDeleted: false
        });
        return Boolean(res?._id);
    }
}