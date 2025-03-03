import type { RouteHandlerMethod } from "fastify";
import type FalAiResult from "../../../dto/FalAiResult.js";

export default (async function (request, reply) {

    const { id } = request.params as { id: string };

    if (typeof id !== "string" || id.length > 40 || id.length === 0)
        return reply.status(400).send({ error: "Invalid id" });

    const falResult = request.locals.dto as FalAiResult;

    const { data: task } = await request.locals.applications.generationTaskApplication.getInProgress({
        internalId: id,
        externalId: falResult.request_id,
    });

    if (!task)
        return reply.status(404).send({ error: "Task not found" });

    await request.locals.applications.eventHandlerApplication.processFalAiResult(falResult, task);

    return reply.status(200).send({ ok: true });

} satisfies RouteHandlerMethod)
