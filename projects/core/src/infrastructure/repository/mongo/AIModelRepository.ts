import type { ServicesType } from "../../../Container.js";
import type { AIModel } from "../../../types/entities/aiModel.js";
import type { IAIModelRepository } from "../../../types/contracts/repositories.js";
import { FilterQuery, UpdateQuery } from "mongoose";

export class AIModelRepository implements IAIModelRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    /** Only `isDeleted` filter is available */
    async get(filter?: Partial<AIModel>, limit = 200): Promise<AIModel[] | null> {
        const _filter: FilterQuery<AIModel> = {};

        if (filter?.isDeleted !== undefined)
            _filter.isDeleted = filter.isDeleted;

        const res = (
            await this.#databaseConnection.models.aiModel
                .find(_filter)
                .limit(limit)
                .lean()
        )
            .map(item => ({
                id: item._id.toString(),
                isDeleted: item.isDeleted,
                name: item.name,
                pricePmu: item.pricePmu,
                title: item.title,
                type: item.type,
                provider: item.provider,
                llmInfo: item.llmInfo,
            } satisfies AIModel));
        return res;
    }

    async getAll(): Promise<AIModel[] | null> {
        const res = (
            await this.#databaseConnection.models.aiModel
                .find({ isDeleted: false })
                .lean()
        )
            .map(item => ({
                id: item._id.toString(),
                isDeleted: item.isDeleted,
                name: item.name,
                pricePmu: item.pricePmu,
                title: item.title,
                type: item.type,
                provider: item.provider,
                llmInfo: item.llmInfo,
            } satisfies AIModel));
        return res;
    }

    async getById(id: string): Promise<AIModel | null> {
        const res = await this.#databaseConnection.models.aiModel
            .findOne({ _id: id, isDeleted: false })
            .lean();
        return res ? {
            id: res._id.toString(),
            isDeleted: res.isDeleted,
            name: res.name,
            pricePmu: res.pricePmu,
            title: res.title,
            type: res.type,
            provider: res.provider,
            llmInfo: res.llmInfo,
        } : null;
    }

    async exists(id: AIModel["id"]): Promise<boolean | null> {
        const res = (
            await this.#databaseConnection.models.aiModel
                .exists({ id, isDeleted: false })
        );
        return Boolean(res?._id);
    }

    async updateById(id: AIModel["id"], update: Partial<AIModel>): Promise<boolean | null> {
        const _update: UpdateQuery<AIModel> = {};

        if(update.isDeleted !== undefined)
            _update.isDeleted = update.isDeleted;

        if(update.llmInfo !== undefined)
            _update.llmInfo = update.llmInfo;

        if(update.name !== undefined)
            _update.name = update.name;

        if(update.title !== undefined)
            _update.title = update.title;

        const res = await this.#databaseConnection.models.aiModel.updateOne({ _id: id }, _update);

        return res.matchedCount === 1;
    }
}