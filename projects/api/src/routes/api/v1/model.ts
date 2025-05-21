import type { RouteHandlerMethod } from "fastify";
import type { AiModelEntity, CaptionOnly } from "bymx-core/types";
import { OperationResultWithData } from "bymx-core/shared";
import UpdateById from "../../../dto/model/UpdateById.js";

export const getAllModels: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<CaptionOnly[]>();

    const models = request.locals.applications.aiModelApplication.getChatModelViewModels();

    result.succeeded().setData(models.map(m => ({ id: m.id, caption: m.title, })));

    return reply.status(200).send(result);

};

export const getAllModelsAdmin: RouteHandlerMethod = async (request, reply) => {
    return reply.status(200).send(
        await request.locals.applications.aiModelApplication.getAllRaw()
    );
};

export const updateById: RouteHandlerMethod = async (request, reply) => {
    const query = request.locals.dto as UpdateById;
    return reply.status(200).send(
        await request.locals.applications.aiModelApplication.updateById(query.id, query)
    );
};

export const refreshModels: RouteHandlerMethod = async (request, reply) => {
    return reply.status(200).send(
        await request.locals.applications.aiModelApplication.renewCache()
    );
};
