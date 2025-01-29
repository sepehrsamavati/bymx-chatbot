import type { ServicesType } from "../Container.js";
import { OperationResultWithData } from "../export/shared.js";
import { GenerationTaskType } from "../types/enums/generationTaskType.js";
import type { GenerationTask } from "../types/entities/generationTask.js";
import type { AIGeneratedMediaResponse } from "../types/contracts/aiResponse.js";
import { falAiResultEventBus, type IFalAiWebhookResult } from "../events/falAiResultEventBus.js";

export default class EventHandlerApplication {
    #promptRepository;
    #generationTaskApplication;

    constructor(container: ServicesType) {
        this.#promptRepository = container.promptRepository;
        this.#generationTaskApplication = container.generationTaskApplication;
    }

    async processFalAiResult(falAiResult: IFalAiWebhookResult, task: GenerationTask) {
        if (falAiResult.status === "OK") {
            await this.#generationTaskApplication.setCompleted(task.internalId, falAiResult, task);
            const responseTime = new Date().getTime() - task.startDate.getTime();
            const responseData = falAiResult.payload as object;

            switch (task.type) {
                case GenerationTaskType.FalAiMiniMaxMusicGeneration: {
                    const result = new OperationResultWithData<AIGeneratedMediaResponse>().failed("musicGenerationFailed");

                    if ('audio' in responseData) {
                        const generatedMusic = responseData?.audio as object;
                        if (generatedMusic && 'url' in generatedMusic && typeof generatedMusic.url === "string") {
                            const contentPolicyViolation = 'has_nsfw_concepts' in responseData && Array.isArray(responseData.has_nsfw_concepts) && responseData.has_nsfw_concepts.includes(true);
                            if (contentPolicyViolation) {
                                result.failed("promptContentNotAllowed");
                            } else {
                                result
                                    .succeeded("musicGenerated")
                                    .setData({
                                        url: generatedMusic.url,
                                        pointUsage: task.promptInfo?.points ?? 0,
                                        modelName: task.model.title,
                                    });

                                if (task.promptInfo)
                                    await this.#promptRepository.create({
                                        ...task.promptInfo,
                                        promptUser: task.user,
                                        insertDate: new Date(),
                                        isDeleted: false,
                                        output: generatedMusic.url,
                                        model: task.model.name,
                                        usages: task.usages.map(u => u.id),
                                        saved: false,
                                        responseTime: responseTime,
                                    });
                            }
                        }
                    }

                    falAiResultEventBus.emit("internalProcessFinished", result, task);
                } break;
                case GenerationTaskType.FalAiTrellis3dModelGeneration: {
                    const result = new OperationResultWithData<AIGeneratedMediaResponse>().failed("modelGenerationFailed");

                    if ('model_mesh' in responseData) {
                        const generated3D = responseData?.model_mesh as object;
                        if (generated3D && 'url' in generated3D && typeof generated3D.url === "string") {
                            const contentPolicyViolation = 'has_nsfw_concepts' in responseData && Array.isArray(responseData.has_nsfw_concepts) && responseData.has_nsfw_concepts.includes(true);
                            if (contentPolicyViolation) {
                                result.failed("promptContentNotAllowed");
                            } else {
                                result
                                    .succeeded("modelGenerated")
                                    .setData({
                                        url: generated3D.url,
                                        pointUsage: task.promptInfo?.points ?? 0,
                                        modelName: task.model.title,
                                    });

                                if (task.promptInfo)
                                    await this.#promptRepository.create({
                                        ...task.promptInfo,
                                        promptUser: task.user,
                                        insertDate: new Date(),
                                        isDeleted: false,
                                        output: generated3D.url,
                                        model: task.model.name,
                                        usages: task.usages.map(u => u.id),
                                        saved: false,
                                        responseTime: responseTime,
                                    });
                            }
                        }
                    }

                    falAiResultEventBus.emit("internalProcessFinished", result, task);
                } break;
            }
        } else {
            await this.#generationTaskApplication.setErrored(task.internalId);
        }
    }
}
