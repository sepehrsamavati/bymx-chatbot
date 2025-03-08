import type { FastifyRequest } from "fastify";
import type { UserEntity } from "bymx-core/types";
import type { CoreServices } from "bymx-core/server";

declare module 'fastify' {
    interface FastifyRequest {
        locals: {
            /** May be null - Be sure to call jwt middleware */
            user: UserEntity.UserViewModel | null;
            dto: unknown;
            applications: CoreServices['applications'];
        };
    }
}