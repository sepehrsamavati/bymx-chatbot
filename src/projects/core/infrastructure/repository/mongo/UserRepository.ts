import type { FilterQuery, Document, FlattenMaps } from "mongoose";
import type { MongoStored, MongoStoredWithId } from "./lib/model.type.js";
import type { ServicesType } from "../../../Container.js";
import type { User, UserDBModel } from "../../../../../types/entities/user.js";
import type { IUserRepository } from "../../../../../types/contracts/repositories.js";

export default class UserRepository implements IUserRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(user: UserDBModel): Promise<User["id"] | null> {
        const result = await this.#databaseConnection.models.user.create(user);
        return result ? result._id.toString() : null;
    }

    #getFilter(filter: Partial<UserDBModel>) {
        const _filter: FilterQuery<MongoStored<UserDBModel>> = {
            isDeleted: filter.isDeleted ?? false
        };

        if (filter.id !== undefined)
            _filter._id = filter.id;

        if (filter.tgId !== undefined)
            _filter.tgId = filter.tgId;

        return _filter;
    }

    #storedToView(result?: FlattenMaps<MongoStoredWithId<UserDBModel>> | null): User | null {
        return result ? {
            id: result._id.toString(),
            firstName: result.firstName,
            lastName: result.lastName,
            username: result.username,
            status: result.status,
            usage: result.usage,
            lastActivity: result.lastActivity,
            tgId: result.tgId,
            type: result.type,
            tier: result.tier,
        } : null;
    }

    async getBy(filter: Pick<Partial<UserDBModel>, 'id' | 'tgId' | 'isDeleted'>): Promise<User | null> {
        const _filter = this.#getFilter(filter);
        const result = await this.#databaseConnection.models.user.findOne(_filter).lean().exec();
        return this.#storedToView(result);
    }

    async getAndUpdate(username: UserDBModel['username'], filter: Pick<User, "id"> | Pick<User, "tgId">): ReturnType<IUserRepository["getBy"]> {
        const _filter = this.#getFilter(filter);
        const result = await this.#databaseConnection.models.user
            .findOneAndUpdate(_filter, {
                username: username,
                lastActivity: Date.now(),
                $inc: { usage: 1 }
            }).lean().exec();
        return this.#storedToView(result);
    }
}