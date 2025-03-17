import type { RouteHandlerMethod } from "fastify";
import type { CaptionOnly } from "bymx-core/types";
import { OperationResultWithData } from "bymx-core/shared";

export const getAllModels: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<CaptionOnly[]>();

    const models = request.locals.applications.aiModelApplication.getChatModelViewModels();

    result.succeeded().setData(models.map(m => ({ id: m.id, caption: m.title, })));

    return reply.status(200).send(result);

};
