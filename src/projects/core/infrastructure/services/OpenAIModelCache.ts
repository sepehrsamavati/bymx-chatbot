import config from "../../config.js";
import type { ServicesType } from "../../Container.js";
import type { OpenAIModel } from "../../../../types/entities/openAIModel.js";
import type { IOpenAIModelCache } from "../../../../types/contracts/services.js";

const queue = new Set<(model: OpenAIModel) => void>();
let defaultModel: OpenAIModel | null = null;

export default class OpenAIModelCache implements IOpenAIModelCache {

    constructor(services: ServicesType) {
        services.openAIModelRepository
            .getAll()
            .then(res => {
                const _defaultModel = res?.find(model => model.id === config.openAI.defaultModelId);
                if (_defaultModel) {
                    defaultModel = _defaultModel;
                    queue.forEach(cb => cb(_defaultModel));
                }
            });
    }

    async getDefault(): Promise<OpenAIModel> {
        if (defaultModel) return defaultModel;
        const promise = new Promise<OpenAIModel>(resolve => queue.add(resolve));
        return promise;
    }
}