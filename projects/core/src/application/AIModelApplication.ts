import config from "../config.js";
import type { ServicesType } from "../Container.js";
import { OperationResult } from "../export/shared.js";
import { AIModelType } from "../types/enums/aiModelType.js";
import { calculatePointUsage } from "../helpers/costCalculator.js";
import type { AIModel, AIModelViewModel } from "../types/entities/aiModel.js";

export default class AIModelApplication {
    #aiModelCache;
    #aiModelRepository;

    /** Image generate */
    get fluxModelName() {
        return "fal-ai/flux/schnell";
    }

    /** 3D model generate */
    get trellisModelName() {
        return "fal-ai/trellis";
    }

    /** Image upscale */
    get auraSrUpscaleModelName() {
        return "fal-ai/aura-sr";
    }

    /** Music generate */
    get minimaxModelName() {
        return "fal-ai/minimax-music";
    }

    constructor(container: ServicesType) {
        this.#aiModelCache = container.aiModelCache;
        this.#aiModelRepository = container.aiModelRepository;
    }

    async getById(modelId: string) {
        return await this.#aiModelRepository.getById(modelId);
    }

    async getFreeModel() {
        return await this.#aiModelCache.getFreeModel();
    }

    async getDefaultModel() {
        return await this.#aiModelCache.getDefault();
    }

    getChatModels() {
        return this.#aiModelCache
            .getCurrentCache()
            .filter(model => model.type === AIModelType.Text)
            .sort((a, b) => a.title.localeCompare(b.title))
            .sort((a, b) => a.pricePmu.output - b.pricePmu.output);
    }

    getChatModelViewModels(): AIModelViewModel[] {
        return this.getChatModels()
            .map(model => ({
                id: model.id,
                title: model.title,
            }));
    }

    generativeModelCostCalculator(model: AIModel, multiplier = 1) {
        const costUsdCent = multiplier * (model.pricePmu.output / (1_000_000 * 100));
        const userPointCost = calculatePointUsage({ usdCent: costUsdCent + (((config.feePercentage * costUsdCent) / 100)) });

        return {
            costUsdCent,
            userPointCost,
        };
    }

    getModelInfoByName(name: string) {
        const model = this.#aiModelCache.getModelByName(name);

        if (!model)
            return;

        return {
            model,
            ...this.generativeModelCostCalculator(model),
        };
    }

    async renewCache() {
        const result = new OperationResult();

        const models = await this.#aiModelRepository.getAll();

        if (models) {
            result.succeeded();
            this.#aiModelCache.setAll(models);
        }

        return result;
    }

    async getAll() {
        return (await this.#aiModelRepository.getAll())?.sort((a, b) => a.pricePmu.output - b.pricePmu.output);
    }
}