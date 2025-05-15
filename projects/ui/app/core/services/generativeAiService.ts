import HttpClient from "../helper/HttpClient";
import type { Api, IOperationResult, IOperationResultWithData } from "bymx-core/types";

const generativeAiService = Object.freeze({
    getImageGeneratePointUsage() {
        return HttpClient.send<IOperationResultWithData<number>>({
            path: "/api/v1/generativeAi/fluxPointCost",
            method: HttpClient.Methods.GET,
        });
    },
    fluxImageGenerate(prompt: Api.GenerativeAi.IImageGenerateRequest['prompt']) {
        return HttpClient.send<IOperationResultWithData<Api.GenerativeAi.IImageGenerateResult>>({
            path: "/api/v1/generativeAi/flux",
            method: HttpClient.Methods.POST,
            body: {
                prompt,
                type: 1,
            } satisfies Api.GenerativeAi.IImageGenerateRequest
        });
    },
});

export default generativeAiService;
