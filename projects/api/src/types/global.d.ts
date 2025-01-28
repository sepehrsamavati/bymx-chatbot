import type { FastifyRequest } from "fastify";
import type { CoreServices } from "bymx-core/server";

declare module 'fastify' {
    interface FastifyRequest {
        locals: {
            /** May be null - Be sure to call jwt middleware */
            user: null;
            dto: unknown;
            applications: CoreServices['applications'];
        };
    }
}