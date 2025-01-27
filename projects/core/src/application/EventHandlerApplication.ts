import type { ServicesType } from "../Container.js";
import { OperationResultWithData } from "../export/shared.js";
import { GenerationTaskType } from "../types/enums/generationTaskType.js";
import type { GenerationTask } from "../types/entities/generationTask.js";
import type { AIGeneratedImageResponse } from "../types/contracts/aiResponse.js";
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

            switch (task.type) {
                case GenerationTaskType.FalAiMiniMaxMusicGeneration: {
                    const responseTime = new Date().getTime() - task.startDate.getTime();

                    const result = new OperationResultWithData<AIGeneratedImageResponse>();
                    const responseData = falAiResult.payload as object;

                    if ('images' in responseData && Array.isArray(responseData.images)) {
                        const generatedImage = responseData.images.at(0);
                        if (generatedImage && responseData.images.length === 1) {
                            const contentPolicyViolation = 'has_nsfw_concepts' in responseData && Array.isArray(responseData.has_nsfw_concepts) && responseData.has_nsfw_concepts.includes(true);
                            if (contentPolicyViolation) {
                                result.failed("promptContentNotAllowed");
                            } else {
                                result
                                    .succeeded()
                                    .setData({
                                        url: generatedImage.url,
                                        pointUsage: task.promptInfo?.points ?? 0,
                                        modelName: task.model.title,
                                    });

                                if (task.promptInfo)
                                    await this.#promptRepository.create({
                                        ...task.promptInfo,
                                        insertDate: new Date(),
                                        isDeleted: false,
                                        output: generatedImage.url,
                                        model: task.model.name,
                                        usages: task.usages.map(u => u.id),
                                        promptUser: task.user,
                                        responseTime: responseTime,
                                    });
                            }
                        }
                    }
                    else
                        result.failed("errorOccurred");

                    falAiResultEventBus.emit("internalProcessFinished", result, task);

                } break;
            }
        } else {
            await this.#generationTaskApplication.setErrored(task.internalId);
        }
    }
}
