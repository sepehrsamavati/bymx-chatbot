import type { ServicesType } from "../Container.js";

export default class PlanApplication {
    #planRepository;

    constructor(container: ServicesType) {
        this.#planRepository = container.planRepository;
    }

    async getAllAvailable() {
        return await this.#planRepository.getMany({
            available: true
        });
    }

    async getInfo(id: string) {
        return await this.#planRepository.getById(id);
    }
}