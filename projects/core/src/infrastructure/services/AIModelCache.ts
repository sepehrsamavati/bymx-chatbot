import config from "../../config.js";
import type { AIModel } from "../../types/entities/aiModel.js";
import type { IAIModelCache } from "../../types/contracts/services.js";

export default class AIModelCache implements IAIModelCache {
    #models: AIModel[] = [];
    #defaultModel: AIModel | null = null;
    #defaultModelQueue = new Set<(model: AIModel) => void>();

    #freeModel: AIModel | null = null;
    #freeModelQueue = new Set<(model: AIModel | null) => void>();

    #lowCostModelModel: AIModel | null = null;
    #lowCostModelModelQueue = new Set<(model: AIModel | null) => void>();

    #modelsLoaded = false;

    setAll(models: AIModel[]) {
        this.#models = models;

        const _defaultModel = models.find(model => model.id === config.openAI.defaultModelId);
        if (_defaultModel) {
            this.#defaultModel = _defaultModel;
            this.#defaultModelQueue.forEach(cb => cb(_defaultModel));
            this.#defaultModelQueue.clear();
        }
        
        const _freeModel = models.find(model => model.id === config.openAI.freeModelId);
        if (_freeModel) {
            this.#freeModel = _freeModel;
            this.#freeModelQueue.forEach(cb => cb(_freeModel));
            this.#freeModelQueue.clear();
        }
        
        const _lowCostModelModel = models.find(model => model.id === config.openAI.lowCostModelId);
        if (_lowCostModelModel) {
            this.#lowCostModelModel = _lowCostModelModel;
            this.#lowCostModelModelQueue.forEach(cb => cb(_lowCostModelModel));
            this.#lowCostModelModelQueue.clear();
        }

        this.#modelsLoaded = true;
    }

    getModelByName(name: string) {
        return this.#models.find(model => model.name === name);
    }


    getCurrentCache() {
        return [...this.#models];
    }

    async getDefault(): Promise<AIModel> {
        if (this.#defaultModel) return this.#defaultModel;
        const promise = new Promise<AIModel>(resolve => this.#defaultModelQueue.add(resolve));
        return promise;
    }

    async getFreeModel(): Promise<AIModel | null> {
        if (this.#modelsLoaded || this.#freeModel) return this.#freeModel;
        const promise = new Promise<AIModel | null>(resolve => this.#freeModelQueue.add(resolve));
        return promise;
    }

    async getLowCostModel(): Promise<AIModel | null> {
        if (this.#modelsLoaded || this.#lowCostModelModel) return this.#lowCostModelModel;
        const promise = new Promise<AIModel | null>(resolve => this.#lowCostModelModelQueue.add(resolve));
        return promise;
    }
}