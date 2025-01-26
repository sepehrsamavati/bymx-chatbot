import type { ServicesType } from "../../../Container.js";
import type { FilterQuery, FlattenMaps, UpdateQuery } from "mongoose";
import type { FlattenToIDs } from "../../../types/contracts/entities.js";
import type { IGenerationTaskRepository } from "../../../types/contracts/repositories.js";
import type { GenerationTask, GenerationTaskDBModel, SearchGenerationTaskModel, UpdateGenerationTaskModel } from "../../../types/entities/generationTask.js";

type CreateModel = FlattenToIDs<GenerationTaskDBModel, 'user' | 'model' | 'usages'>;
type SearchModel = FlattenToIDs<SearchGenerationTaskModel, 'user' | 'model'>;

export class GenerationTaskRepository implements IGenerationTaskRepository {
    #databaseConnection;

    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(chat: CreateModel): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.telegramJoinRequiredChat.create(chat);
        return Boolean(typeof res?._id !== "string");
    }

    #getFilter(filter: SearchModel) {
        const _filter: FilterQuery<GenerationTaskDBModel> = {};

        if (filter.internalId !== undefined)
            _filter.internalId = filter.internalId;

        if (filter.externalId !== undefined)
            _filter.externalId = filter.externalId;

        if (filter.user !== undefined)
            _filter.user = filter.user;

        if (filter.isDeleted !== undefined)
            _filter.isDeleted = filter.isDeleted;

        if (filter.status !== undefined)
            _filter.status = filter.status;

        if (filter.type !== undefined)
            _filter.type = filter.type;

        if (filter.expiryBefore !== undefined)
            _filter.expiry = {
                $lt: filter.expiryBefore
            };

        return _filter;
    }

    #getUpdate(update: UpdateGenerationTaskModel) {
        const _update: UpdateQuery<GenerationTaskDBModel> = {};

        if (update.externalId !== undefined)
            _update.externalId = update.externalId;

        if (update.isDeleted !== undefined)
            _update.isDeleted = update.isDeleted;

        if (update.status !== undefined)
            _update.status = update.status;

        if (update.type !== undefined)
            _update.type = update.type;

        if (update.result !== undefined)
            _update.result = update.result;

        if (update.startDate !== undefined)
            _update.startDate = update.startDate;

        if (update.endDate !== undefined)
            _update.endDate = update.endDate;

        return _update;
    }

    #storedToView(result?: FlattenMaps<GenerationTaskDBModel> | null): GenerationTask | null {
        if (!result)
            return null;

        const generationTask: GenerationTask = {
            internalId: result.internalId,
            externalId: result.externalId,
            expiry: result.expiry,
            result: result.result,
            status: result.status,
            type: result.type,
            usages: result.usages,
            user: result.user,
            startDate: result.startDate,
            endDate: result.endDate,
            model: result.model,
            cost: result.cost,
            points: result.points,
        };

        return generationTask;
    }

    async getOne(filter: SearchModel): Promise<GenerationTask | null> {
        const res = await this.#databaseConnection.models.generationTask
            .findOne(this.#getFilter(filter))
            .populate([
                'user',
                'usages'
            ] satisfies Array<keyof GenerationTask>)
            .lean()
            .exec();

        return this.#storedToView(res);
    }

    async getMany(filter: SearchModel): Promise<GenerationTask[] | null> {
        const res = await this.#databaseConnection.models.generationTask
            .find(this.#getFilter(filter))
            .populate([
                'user',
                'usages'
            ] satisfies Array<keyof GenerationTask>)
            .lean()
            .exec();

        return res ? res.map(item => this.#storedToView(item) as GenerationTask) : null;
    }

    async updateOne(filter: Pick<GenerationTask, 'internalId'>, update: UpdateGenerationTaskModel): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.telegramJoinRequiredChat.updateOne({
            internalId: filter.internalId,
        }, this.#getUpdate(update));

        return Boolean(res.matchedCount !== 0);
    }

    async updateMany(filter: SearchModel, update: UpdateGenerationTaskModel): Promise<boolean | null> {
        await this.#databaseConnection.models.telegramJoinRequiredChat.updateMany(this.#getFilter(filter), this.#getUpdate(update));
        return true;
    }
}
