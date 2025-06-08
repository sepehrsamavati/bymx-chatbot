import type { RouteHandlerMethod } from "fastify";
import { OperationResultWithData } from "bymx-core/shared";
import type UpdateById from "../../../dto/model/UpdateById.js";
import type { AiModelEntity, CaptionOnly } from "bymx-core/types";

export const getAllModelsCaptionOnly: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<CaptionOnly[]>();

    const models = request.locals.applications.aiModelApplication.getChatModelViewModels();

    result.succeeded().setData(models.map(m => ({ id: m.id, caption: m.title, })));

    return reply.status(200).send(result);

};

export const getAllModelsViewModel: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<AiModelEntity.AIModelViewModel[]>();

    const models = request.locals.applications.aiModelApplication.getChatModelViewModels();

    result.succeeded().setData(models);

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

export const getDefaultModelId: RouteHandlerMethod = async (request, reply) => {
    const model = await request.locals.applications.aiModelApplication.getDefaultModel();
    return reply.status(200).send(
        new OperationResultWithData<string>().succeeded().setData(model.id)
    );
};
