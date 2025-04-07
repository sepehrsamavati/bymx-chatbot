import type { ServicesType } from "../Container.js";
import { OperationResultWithData } from "../export/shared.js";

export default class MetadataStoreApplication {
    #scope;
    #metadataStoreRepository;

    constructor(container: ServicesType) {
        this.#scope = container.projectName;
        this.#metadataStoreRepository = container.metadataStoreRepository;
    }

    async set(key: string, value: string) {
        const result = new OperationResultWithData<string>();

        const createdMetadataId = await this.#metadataStoreRepository.create({
            scope: this.#scope,
            key: key,
            value: value,
        });

        if (createdMetadataId)
            result.succeeded().setData(createdMetadataId);

        return result;
    }

    async getById(id: string) {
        return await this.#metadataStoreRepository.getOne({ id, scope: this.#scope, });
    }
}
