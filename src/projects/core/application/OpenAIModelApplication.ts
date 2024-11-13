import config from "../config.js";
import type { ServicesType } from "../Container.js";
import type { OpenAIModel } from "../../../types/entities/openAIModel.js";

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

    calculateModelUsage(model: OpenAIModel) {
        const includeFee = (1 - (config.openAI.feePercentage / 100));

        const normalLengthTextMessage = Math.floor(
            includeFee * (
                (((1e6 /* 1M tokens */) / model.pricePmu.inputText) / (300 /* 300 input tokens */))
                + (((1e6 /* 1M tokens */) / model.pricePmu.outputText) / (300 /* 300 output tokens */))
            )
        );

        return {
            /** Messages per 1K points ($1) */
            normalLengthTextMessage
        };
    }
}