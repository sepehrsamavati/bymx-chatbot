import url from 'node:url';
import path from 'node:path';
import IdDto from '../dto/IdDto.js';
import jwt from "../middlewares/jwt.js";
import ChatID from "../dto/chat/ChatID.js";
import FastifyStatic from "@fastify/static";
import fileHandler from '@fastify/multipart';
import type { FastifyInstance } from "fastify";
import FalAiResult from "../dto/FalAiResult.js";
import TelegramAuth from "../dto/user/TelegramAuth.js";
import { httpServerUrls } from "bymx-core/server";
import ChatPrompt from "../dto/chat/ChatPrompt.js";
import authGuard from "../middlewares/authGuard.js";
import SetChatTitle from "../dto/chat/SetChatTitle.js";
import SetChatModel from "../dto/chat/SetChatModel.js";
import ChangeLanguage from '../dto/user/ChangeLanguage.js';
import { dtoValidator } from "../middlewares/dtoValidator.js";
import ChatMessagesQuery from "../dto/chat/ChatMessagesQuery.js";
import SetChatMemoryAmount from "../dto/chat/SetChatMemoryAmount.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

import * as file from './api/v1/file.js';
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
        decorateReply: true,
        // index: "index.html",
        // constraints: { host: 'example.com' } // optional: default {}
    });

    fastifyInstance.register((instance, _, next) => {

        instance.addHook('onRequest', jwt);
        instance.addHook('onRequest', authGuard);

        instance.register(fileHandler);

        instance.put("/upload", file.uploadAttachment);
        instance.delete("/attachment", { preValidation: dtoValidator(IdDto) }, file.deleteAttachment);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/file" });

    fastifyInstance.register((instance, _, next) => {

        instance.post("/tgAuth", { preValidation: dtoValidator(TelegramAuth) }, user.telegramAuth);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/user" });

    fastifyInstance.register((instance, _, next) => {

        instance.addHook('onRequest', jwt);
        instance.addHook('onRequest', authGuard);

        instance.get("/info", user.getInfo);
        instance.patch("/language", { preValidation: dtoValidator(ChangeLanguage) }, user.changeLanguage);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/user" });

    fastifyInstance.register((instance, _, next) => {

        instance.addHook('onRequest', jwt);
        instance.addHook('onRequest', authGuard);

        instance.get("/all", chat.getAllChats);
        instance.delete("/", { preValidation: dtoValidator(ChatID) }, chat.deleteChat);
        instance.get("/model", { preValidation: dtoValidator(ChatID) }, chat.getChatSelectedModel);
        instance.patch("/model", { preValidation: dtoValidator(SetChatModel) }, chat.setChatModel);
        instance.patch("/memory", { preValidation: dtoValidator(SetChatMemoryAmount) }, chat.setChatMemoryAmount);
        instance.patch("/title", { preValidation: dtoValidator(SetChatTitle) }, chat.setChatTitle);
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

    fastifyInstance.setNotFoundHandler(function (req, res) {
        void res.sendFile('index.html')
    });
};
