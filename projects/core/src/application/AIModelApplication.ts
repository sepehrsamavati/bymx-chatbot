import type { ServicesType } from "../Container.js";
import { AIModelType } from "../types/enums/aiModelType.js";

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

    getChatModels() {
        return this.#aiModelCache.getCurrentCache().filter(model => model.type === AIModelType.Text);
    }

    async getAll() {
        return (await this.#aiModelRepository.getAll())?.sort((a, b) => a.pricePmu.outputText - b.pricePmu.outputText);
    }
}