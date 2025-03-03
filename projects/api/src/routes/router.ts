import type { FastifyInstance } from "fastify";
import FalAiResult from "../dto/FalAiResult.js";
import { httpServerUrls } from "bymx-core/server";
import { dtoValidator } from "../middlewares/dtoValidator.js";

import getTempFile from "./api/v1/getTempFile.js";
import falAiSetResult from "./api/v1/falAiSetResult.js";

export const setRoutes = (fastifyInstance: FastifyInstance) => {
    fastifyInstance.register((instance, _, next) => {

        instance.get(`/${httpServerUrls.v1.tempFile.path}/:id`, getTempFile);

        instance.post(`/${httpServerUrls.v1.falAiSetResult.path}/:id`, { preValidation: dtoValidator(FalAiResult) }, falAiSetResult);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress });
};
