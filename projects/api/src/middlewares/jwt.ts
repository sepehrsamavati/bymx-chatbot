import type { UserEntity } from "bymx-core/types";
import type { onRequestHookHandler } from "fastify";
import { validateToken } from "../helpers/jwtHelper.js";
import { extractCookies } from "../helpers/cookieHelper.js";

export default (async function jwtValidator(request, _reply) {
    const authToken = extractCookies(request.headers.cookie)?.find(c => c.key === 'Auth')?.value;

    if (!authToken)
        return;

    const payload = await validateToken(authToken, "test");

    if (!payload)
        return;

    const userInfo = payload as UserEntity.UserViewModel;

    request.locals.user = userInfo;
}) as onRequestHookHandler;
