import jwt from "../middlewares/jwt.js";
import type { FastifyInstance } from "fastify";
import FalAiResult from "../dto/FalAiResult.js";
import TelegramAuth from "../dto/TelegramAuth.js";
import { httpServerUrls } from "bymx-core/server";
import authGuard from "../middlewares/authGuard.js";
import { dtoValidator } from "../middlewares/dtoValidator.js";

import * as user from "./api/v1/user.js";
import * as chat from "./api/v1/chat.js";
import getTempFile from "./api/v1/getTempFile.js";
import { getLanguageData } from "./api/v1/uiText.js";
import falAiSetResult from "./api/v1/falAiSetResult.js";
import ChatMessagesQuery from "../dto/ChatMessagesQuery.js";

export const setRoutes = (fastifyInstance: FastifyInstance) => {

    fastifyInstance.register((instance, _, next) => {

        instance.addHook('onRequest', jwt);

        instance.post("/tgAuth", { preValidation: dtoValidator(TelegramAuth) }, user.telegramAuth);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/user" });

    fastifyInstance.register((instance, _, next) => {

        instance.addHook('onRequest', jwt);
        instance.addHook('onRequest', authGuard);

        instance.get("/all", chat.getAllChats);
        instance.get("/messages", { preValidation: dtoValidator(ChatMessagesQuery) }, chat.getChatMessages);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/chat" });


    fastifyInstance.register((instance, _, next) => {

        instance.get(`/${httpServerUrls.v1.tempFile.path}/:id`, getTempFile);

        instance.post(`/${httpServerUrls.v1.falAiSetResult.path}/:id`, { preValidation: dtoValidator(FalAiResult) }, falAiSetResult);

        instance.get("/uiText/:langCode", getLanguageData);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress });
};
