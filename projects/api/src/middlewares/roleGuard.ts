import { UserType } from "bymx-core/shared";
import type { onRequestHookHandler } from "fastify";

export default function roleGuard(allow: UserType[]) {
    return (
        (function (request, reply, done) {
            if (request.locals.user?.type === UserType.Owner || allow.includes(request.locals.user!?.type))
                return done();

            reply.status(403).send({ message: "No access" });
        }) as onRequestHookHandler
    );
};
