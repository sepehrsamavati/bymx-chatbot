import type { FilterQuery } from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { IMetadataStoreRepository } from "../../../types/contracts/repositories.js";
import type { CreateMetadataStoreModel, MetadataStore, MetadataStoreDbModel, SearchMetadataStoreModel } from "../../../types/entities/metadataStore.js";

export class MetadataStoreRepository implements IMetadataStoreRepository {
    #databaseConnection;

    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(chat: CreateMetadataStoreModel): Promise<string | null> {
        const res = await this.#databaseConnection.models.metadataStore.create(chat);
        return res?._id.toString();
    }

    #getFilter(filter: SearchMetadataStoreModel) {
        const _filter: FilterQuery<MetadataStoreDbModel> = {};

        if (filter.scope !== undefined)
            _filter.scope = filter.scope;

        if (filter.key !== undefined)
            _filter.key = filter.key;

        if (filter.value !== undefined)
            _filter.value = filter.value;

        return _filter;
    }

    async getOne(filter: SearchMetadataStoreModel): Promise<MetadataStore | null> {
        const res = await this.#databaseConnection.models.metadataStore
            .findOne(this.#getFilter(filter))
            .lean()
            .exec();

        return res ? {
            id: res._id.toString(),
            key: res.key,
            scope: res.scope,
            value: res.value,
        } : null;
    }
}
