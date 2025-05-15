import url from 'node:url';
import path from 'node:path';
import IdDto from '../dto/IdDto.js';
import jwt from "../middlewares/jwt.js";
import ChatID from "../dto/chat/ChatID.js";
import FastifyStatic from "@fastify/static";
import fileHandler from '@fastify/multipart';
import FalAiResult from "../dto/FalAiResult.js";
import { httpServerUrls } from "bymx-core/server";
import ChatPrompt from "../dto/chat/ChatPrompt.js";
import authGuard from "../middlewares/authGuard.js";
import SetChatTitle from "../dto/chat/SetChatTitle.js";
import SetChatModel from "../dto/chat/SetChatModel.js";
import TelegramAuth from "../dto/user/TelegramAuth.js";
import ChangeLanguage from '../dto/user/ChangeLanguage.js';
import TelegramOtpLogin from '../dto/user/TelegramOtpLogin.js';
import ChatMessagesQuery from "../dto/chat/ChatMessagesQuery.js";
import ImageGenerate from '../dto/generativeAi/ImageGenerate.js';
import TelegramOtpRequest from '../dto/user/TelegramOtpRequest.js';
import SetChatMemoryAmount from "../dto/chat/SetChatMemoryAmount.js";
import type { FastifyInstance, FastifyPluginCallback } from "fastify";
import { fastifyPayloadValidator } from "../middlewares/dtoValidator.js";

import websocket from '@fastify/websocket';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

import * as file from './api/v1/file.js';
import * as user from "./api/v1/user.js";
import * as chat from "./api/v1/chat.js";
import * as model from "./api/v1/model.js";
import getTempFile from "./api/v1/getTempFile.js";
import { getLanguageData } from "./api/v1/uiText.js";
import falAiSetResult from "./api/v1/falAiSetResult.js";
import * as generativeAi from "./api/v1/generativeAi.js";
import { setWsHandlers } from '../webSocket/v1/setWsHandlers.js';

export const setRoutes = (fastifyInstance: FastifyInstance) => {

    fastifyInstance.register(FastifyStatic, {
        root: path.join(__dirname, '../../../ui/build/client'),
        prefix: '/ui', // optional: default '/'
        decorateReply: true,
        // index: "index.html",
        // constraints: { host: 'example.com' } // optional: default {}
    });

    fastifyInstance.register((wsController, _, next) => {
        wsController.register(websocket, {
            prefix: httpServerUrls.v1.baseAddress + "/ws"
        })
            .after(() => {
                setWsHandlers(wsController);
            });

        next();
    }, {
        prefix: httpServerUrls.v1.baseAddress + "/ws",
    });

    fastifyInstance.register((fileController, _, next) => {

        fileController.addHook('onRequest', jwt);
        fileController.addHook('onRequest', authGuard);

        fileController.register(fileHandler);

        fileController.get("/task", { preValidation: fastifyPayloadValidator(IdDto) }, file.getTaskFile);
        fileController.put("/upload", file.uploadAttachment);
        fileController.delete("/attachment", { preValidation: fastifyPayloadValidator(IdDto) }, file.deleteAttachment);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/file" });

    fastifyInstance.register((userControllerNoAuth, _, next) => {

        userControllerNoAuth.post("/tgAuth", { preValidation: fastifyPayloadValidator(TelegramAuth) }, user.telegramAuth);
        userControllerNoAuth.post("/tgOtp", { preValidation: fastifyPayloadValidator(TelegramOtpRequest) }, user.sendTelegramOtp);
        userControllerNoAuth.post("/tgOtpAuth", { preValidation: fastifyPayloadValidator(TelegramOtpLogin) }, user.telegramOtpAuth);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/user" });

    fastifyInstance.register((userController, _, next) => {

        userController.addHook('onRequest', jwt);
        userController.addHook('onRequest', authGuard);

        userController.get("/info", user.getInfo);
        userController.get("/me", user.getMe);
        userController.patch("/language", { preValidation: fastifyPayloadValidator(ChangeLanguage) }, user.changeLanguage);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/user" });

    fastifyInstance.register((chatController, _, next) => {

        chatController.addHook('onRequest', jwt);
        chatController.addHook('onRequest', authGuard);

        chatController.get("/all", chat.getAllChats);
        chatController.delete("/", { preValidation: fastifyPayloadValidator(ChatID) }, chat.deleteChat);
        chatController.get("/model", { preValidation: fastifyPayloadValidator(ChatID) }, chat.getChatSelectedModel);
        chatController.patch("/model", { preValidation: fastifyPayloadValidator(SetChatModel) }, chat.setChatModel);
        chatController.patch("/memory", { preValidation: fastifyPayloadValidator(SetChatMemoryAmount) }, chat.setChatMemoryAmount);
        chatController.patch("/title", { preValidation: fastifyPayloadValidator(SetChatTitle) }, chat.setChatTitle);
        chatController.get("/messages", { preValidation: fastifyPayloadValidator(ChatMessagesQuery) }, chat.getChatMessages);
        chatController.delete("/messages", { preValidation: fastifyPayloadValidator(ChatID) }, chat.clearChatHistory);
        chatController.post("/prompt", { preValidation: fastifyPayloadValidator(ChatPrompt) }, chat.submitPrompt);
        chatController.get("/canICreateANewChat", chat.canCreateNewChat);
        chatController.post("/new", chat.createNewChat);
        chatController.post("/generateTitle", { preValidation: fastifyPayloadValidator(ChatID) }, chat.generateAndSetTitle);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/chat" });

    fastifyInstance.register((modelController, _, next) => {

        modelController.addHook('onRequest', jwt);
        modelController.addHook('onRequest', authGuard);

        modelController.get("/all", model.getAllModels);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/model" });

    fastifyInstance.register((generativeAiController, _, next) => {

        generativeAiController.addHook('onRequest', jwt);
        generativeAiController.addHook('onRequest', authGuard);

        generativeAiController.get("/fluxPointCost", generativeAi.fluxImageGenerateCost);
        generativeAiController.post("/flux", { preValidation: fastifyPayloadValidator(ImageGenerate) }, generativeAi.fluxImageGenerate);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/generativeAi" });


    fastifyInstance.register((baseController, _, next) => {

        baseController.get(`/${httpServerUrls.v1.tempFile.path}/:id`, getTempFile);

        baseController.post(`/${httpServerUrls.v1.falAiSetResult.path}/:id`, { preValidation: fastifyPayloadValidator(FalAiResult) }, falAiSetResult);

        baseController.get("/uiText/:langCode", getLanguageData);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress });

    fastifyInstance.setNotFoundHandler(function (req, res) {

        if (req.url === "" || req.url === "/" || req.url.toLowerCase().startsWith('/ui'))
            return res.sendFile('index.html');

        void res.status(404).send({
            ok: false,
            message: "Not found"
        });
    });
};
