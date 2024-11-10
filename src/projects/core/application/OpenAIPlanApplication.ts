import type { ServicesType } from "../Container.js";

export default class OpenAIPlanApplication {
    #openAIPlanRepository;

    constructor(container: ServicesType) {
        this.#openAIPlanRepository = container.openAIPlanRepository;
    }

    async getAllAvailable() {
        return await this.#openAIPlanRepository.getMany({
            available: true
        });
    }
}