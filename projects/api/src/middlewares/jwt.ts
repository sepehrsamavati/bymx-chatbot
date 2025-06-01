import type { UserEntity } from "bymx-core/types";
import type { onRequestHookHandler } from "fastify";

export default (async function jwtValidator(request, _reply) {
    try {
        await request.jwtVerify();
    } catch {
        return;
    }

    const payload = request.user;

    if (!payload)
        return;

    const userInfo = payload as UserEntity.UserViewModel;

    request.locals.user = userInfo;
}) as onRequestHookHandler;