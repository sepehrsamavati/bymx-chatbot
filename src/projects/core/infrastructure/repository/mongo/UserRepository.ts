import type { ServicesType } from "../../../Container.js";
import type { FilterQuery, FlattenMaps, UpdateQuery } from "mongoose";
import type { MongoStored, MongoStoredWithId } from "./lib/model.type.js";
import type { IUserRepository } from "../../../../../types/contracts/repositories.js";
import type { User, UserDBModel, CreateUserModel, UpdateUserModel } from "../../../../../types/entities/user.js";

export default class UserRepository implements IUserRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(user: CreateUserModel): Promise<User["id"] | null> {
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

    #getUpdate(update: UpdateUserModel) {
        const _update: UpdateQuery<UserDBModel> = {
            isDeleted: update.isDeleted ?? false
        };

        if (update.username !== undefined)
            _update.username = update.username;

        if (update.firstName !== undefined)
            _update.firstName = update.firstName;

        if (update.lastName !== undefined)
            _update.lastName = update.lastName;

        if (update.isDeleted !== undefined)
            _update.isDeleted = update.isDeleted;

        if (update.mode !== undefined)
            _update.mode = update.mode;

        if (update.tier !== undefined)
            _update.tier = update.tier;

        if (update.type !== undefined)
            _update.type = update.type;

        return _update;
    }

    #storedToView(result?: FlattenMaps<MongoStoredWithId<UserDBModel>> | null): User | null {
        return result ? {
            id: result._id.toString(),
            firstName: result.firstName,
            lastName: result.lastName,
            username: result.username,
            status: result.status,
            usage: result.usage,
            mode: result.mode,
            lang: result.lang,
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

    async getAndUpdate(update: UpdateUserModel, filter: Pick<User, "id"> | Pick<User, "tgId">): ReturnType<IUserRepository["getBy"]> {
        const _filter = this.#getFilter(filter);

        const _update: UpdateQuery<UserDBModel> = {
            lastActivity: Date.now(),
            $inc: { usage: 1 },
            ...this.#getUpdate(update)
        };

        const result = await this.#databaseConnection.models.user
            .findOneAndUpdate(_filter, _update).lean().exec();

        return this.#storedToView(result);
    }

    async update(id: UserDBModel['id'], update: UpdateUserModel) {
        const _filter = this.#getFilter({ id });
        const _update = this.#getUpdate(update);

        const result = await this.#databaseConnection.models.user.updateOne(_filter, _update).lean().exec();

        return {
            ok: result.modifiedCount === 1
        };
    }
}