import type { ServicesType } from "../Container.js";
import { OperationResult } from "../export/shared.js";
import { AIModelType } from "../types/enums/aiModelType.js";
import type { AIModelViewModel } from "../types/entities/aiModel.js";

export default class AIModelApplication {
    #aiModelCache;
    #aiModelRepository;

    constructor(container: ServicesType) {
        this.#aiModelCache = container.aiModelCache;
        this.#aiModelRepository = container.aiModelRepository;
    }

    async getById(modelId: string) {
        return await this.#aiModelRepository.getById(modelId);
    }

    async getFreeModel() {
        return await this.#aiModelCache.getFreeModel();
    }
    
    async getDefaultModel() {
        return await this.#aiModelCache.getDefault();
    }

    getChatModels() {
        return this.#aiModelCache
            .getCurrentCache()
            .filter(model => model.type === AIModelType.Text)
            .sort((a, b) => a.title.localeCompare(b.title))
            .sort((a, b) => a.pricePmu.output - b.pricePmu.output);
    }

    getChatModelViewModels(): AIModelViewModel[] {
        return this.getChatModels()
            .map(model => ({
                id: model.id,
                title: model.title,
            }));
    }

    async renewCache() {
        const result = new OperationResult();

        const models = await this.#aiModelRepository.getAll();

        if (models) {
            result.succeeded();
            this.#aiModelCache.setAll(models);
        }

        return result;
    }

    async getAll() {
        return (await this.#aiModelRepository.getAll())?.sort((a, b) => a.pricePmu.output - b.pricePmu.output);
    }
}