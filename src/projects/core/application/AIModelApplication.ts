import type { ServicesType } from "../Container.js";

export default class AIModelApplication {
    #aiModelRepository;

    constructor(container: ServicesType) {
        this.#aiModelRepository = container.aiModelRepository;
    }

    async getById(modelId: string) {
        return await this.#aiModelRepository.getById(modelId);
    }

    async getAll() {
        return (await this.#aiModelRepository.getAll())?.sort((a, b) => a.pricePmu.outputText - b.pricePmu.outputText);
    }
}