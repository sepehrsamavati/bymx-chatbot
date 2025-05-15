import type { Api } from "bymx-core/types";
import type { RouteHandlerMethod } from "fastify";
import { OperationResultWithData } from "bymx-core/shared";
import type ImageGenerate from "../../../dto/generativeAi/ImageGenerate.js";

export const fluxImageGenerate: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<Api.GenerativeAi.IImageGenerateResult>();

    const userId = request.locals.user?.id!;
    const user = await request.locals.applications.userApplication.getUserById(userId);
    const query = request.locals.dto as ImageGenerate;

    if (!user)
        result.failed("userNotFound");
    else {
        const imageGenerateResult = await request.locals.applications.aiApplication.fluxImageGenerate(user, query.prompt);

        if (imageGenerateResult.data)
            result
                .succeeded()
                .setData({
                    id: imageGenerateResult.data.taskInternalId,
                    modelName: imageGenerateResult.data.modelName,
                    pointUsage: imageGenerateResult.data.pointUsage,
                });
        else
            result.failed(imageGenerateResult.message);
    }

    return reply.status(200).send(result);

};

export const fluxImageGenerateCost: RouteHandlerMethod = async (request, reply) => {
    const result = new OperationResultWithData<number>();

    const modelInfo = request.locals.applications.aiModelApplication.getModelInfoByName(request.locals.applications.aiModelApplication.fluxModelName);

    if (modelInfo)
        result.succeeded().setData(modelInfo.userPointCost);

    return reply.status(200).send(result);
};
