import type { ServicesType } from "../Container.js";

export default class OpenAIModelApplication {
    #openAIModelRepository;

    constructor(container: ServicesType) {
        this.#openAIModelRepository = container.openAIModelRepository;
    }

    async getAll() {
        return await this.#openAIModelRepository.getAll();
    }
}