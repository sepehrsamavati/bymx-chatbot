// generativeAi
import type { RouteHandlerMethod } from "fastify";
import type { CaptionOnly } from "bymx-core/types";
import { OperationResultWithData } from "bymx-core/shared";
import type ImageGenerate from "../../../dto/generativeAi/ImageGenerate.js";

export const generateImage: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<CaptionOnly[]>();

    const userId = request.locals.user?.id!;
    const user = await request.locals.applications.userApplication.getUserById(userId);
    const query = request.locals.dto as ImageGenerate;

    if (!user)
        result.failed("userNotFound");
    else {
        const imageGenerateResult = await request.locals.applications.aiApplication.fluxImageGenerate(user, query.prompt);


    }

    return reply.status(200).send(result);

};
