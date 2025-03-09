import type { onRequestHookHandler } from "fastify";

export default (async function authGuard(request, reply) {
    if (request.locals.user)
        return;

    reply.status(401).send({ message: "Authorization required!" });
}) as onRequestHookHandler;
