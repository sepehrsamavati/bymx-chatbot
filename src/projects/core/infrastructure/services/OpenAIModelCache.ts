import config from "../../config.js";
import type { ServicesType } from "../../Container.js";
import type { AIModel } from "../../../../types/entities/aiModel.js";
import type { IAIModelCache } from "../../../../types/contracts/services.js";

const queue = new Set<(model: AIModel) => void>();
let defaultModel: AIModel | null = null;

export default class AIModelCache implements IAIModelCache {

    constructor(services: ServicesType) {
        services.aiModelRepository
            .getAll()
            .then(res => {
                const _defaultModel = res?.find(model => model.id === config.openAI.defaultModelId);
                if (_defaultModel) {
                    defaultModel = _defaultModel;
                    queue.forEach(cb => cb(_defaultModel));
                }
            });
    }

    async getDefault(): Promise<AIModel> {
        if (defaultModel) return defaultModel;
        const promise = new Promise<AIModel>(resolve => queue.add(resolve));
        return promise;
    }
}