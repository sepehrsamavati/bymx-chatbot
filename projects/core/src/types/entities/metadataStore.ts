import type { StoredEntity } from "../contracts/entities.js";

export type MetadataStore = {
    id: string;
    /** Name of scope/project name; Passed on DI container creation */
    scope: string;
    key: string;
    value: string;
}

export type MetadataStoreDbModel = StoredEntity<MetadataStore>;

export type CreateMetadataStoreModel = Pick<MetadataStoreDbModel, 'scope' | 'key' | 'value'>;

export type SearchMetadataStoreModel = Partial<MetadataStore>;
