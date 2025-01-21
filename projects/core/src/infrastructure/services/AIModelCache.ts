import config from "../../config.js";
import type { AIModel } from "../../types/entities/aiModel.js";
import type { IAIModelCache } from "../../types/contracts/services.js";

export default class AIModelCache implements IAIModelCache {
    #models: AIModel[] = [];
    #defaultModel: AIModel | null = null;
    #queue = new Set<(model: AIModel) => void>();

    setAll(models: AIModel[]) {
        this.#models = models;
        const _defaultModel = models.find(model => model.id === config.openAI.defaultModelId);
        if (_defaultModel) {
            this.#defaultModel = _defaultModel;
            this.#queue.forEach(cb => cb(_defaultModel));
            this.#queue.clear();
        }
    }

    getModelByName(name: string) {
        return this.#models.find(model => model.name === name);
    }


    getCurrentCache() {
        return [...this.#models];
    }

    async getDefault(): Promise<AIModel> {
        if (this.#defaultModel) return this.#defaultModel;
        const promise = new Promise<AIModel>(resolve => this.#queue.add(resolve));
        return promise;
    }
}