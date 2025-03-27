import url from 'node:url';
import path from 'node:path';
import jwt from "../middlewares/jwt.js";
import ChatID from "../dto/chat/ChatID.js";
import FastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import FalAiResult from "../dto/FalAiResult.js";
import TelegramAuth from "../dto/TelegramAuth.js";
import { httpServerUrls } from "bymx-core/server";
import ChatPrompt from "../dto/chat/ChatPrompt.js";
import authGuard from "../middlewares/authGuard.js";
import SetChatModel from "../dto/chat/SetChatModel.js";
import { dtoValidator } from "../middlewares/dtoValidator.js";
import ChatMessagesQuery from "../dto/chat/ChatMessagesQuery.js";
import SetChatMemoryAmount from "../dto/chat/SetChatMemoryAmount.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

import * as user from "./api/v1/user.js";
import * as chat from "./api/v1/chat.js";
import * as model from "./api/v1/model.js";
import getTempFile from "./api/v1/getTempFile.js";
import { getLanguageData } from "./api/v1/uiText.js";
import falAiSetResult from "./api/v1/falAiSetResult.js";

export const setRoutes = (fastifyInstance: FastifyInstance) => {

    fastifyInstance.register(FastifyStatic, {
        root: path.join(__dirname, '../../../ui/build/client'),
        prefix: '/ui', // optional: default '/'
        // constraints: { host: 'example.com' } // optional: default {}
    });

    fastifyInstance.get("/", (_, res) => {
        res.redirect("/ui/");
    });

    fastifyInstance.get("/ui", (_, res) => {
        res.redirect("/ui/");
    });

    fastifyInstance.register((instance, _, next) => {

        instance.addHook('onRequest', jwt);

        instance.post("/tgAuth", { preValidation: dtoValidator(TelegramAuth) }, user.telegramAuth);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/user" });

    fastifyInstance.register((instance, _, next) => {

        instance.addHook('onRequest', jwt);
        instance.addHook('onRequest', authGuard);

        instance.get("/all", chat.getAllChats);
        instance.get("/model", { preValidation: dtoValidator(ChatID) }, chat.getChatSelectedModel);
        instance.patch("/model", { preValidation: dtoValidator(SetChatModel) }, chat.setChatModel);
        instance.patch("/memory", { preValidation: dtoValidator(SetChatMemoryAmount) }, chat.setChatMemoryAmount);
        instance.get("/messages", { preValidation: dtoValidator(ChatMessagesQuery) }, chat.getChatMessages);
        instance.delete("/messages", { preValidation: dtoValidator(ChatID) }, chat.clearChatHistory);
        instance.post("/prompt", { preValidation: dtoValidator(ChatPrompt) }, chat.submitPrompt);
        instance.get("/canICreateANewChat", chat.canCreateNewChat);
        instance.post("/new", chat.createNewChat);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/chat" });

    fastifyInstance.register((instance, _, next) => {

        instance.addHook('onRequest', jwt);
        instance.addHook('onRequest', authGuard);

        instance.get("/all", model.getAllModels);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/model" });


    fastifyInstance.register((instance, _, next) => {

        instance.get(`/${httpServerUrls.v1.tempFile.path}/:id`, getTempFile);

        instance.post(`/${httpServerUrls.v1.falAiSetResult.path}/:id`, { preValidation: dtoValidator(FalAiResult) }, falAiSetResult);

        instance.get("/uiText/:langCode", getLanguageData);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress });
};
