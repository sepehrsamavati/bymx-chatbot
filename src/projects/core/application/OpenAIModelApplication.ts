import type { ServicesType } from "../Container.js";

export default class OpenAIModelApplication {
    #openAIModelRepository;

    constructor(container: ServicesType) {
        this.#openAIModelRepository = container.openAIModelRepository;
    }

    async getById(modelId: string) {
        return await this.#openAIModelRepository.getById(modelId);
    }

    async getAll() {
        return (await this.#openAIModelRepository.getAll())?.sort((a, b) => a.pricePmu.outputText - b.pricePmu.outputText);
    }
}