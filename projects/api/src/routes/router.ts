import url from 'node:url';
import path from 'node:path';
import IdDto from '../dto/IdDto.js';
import jwt from "../middlewares/jwt.js";
import ChatID from "../dto/chat/ChatID.js";
import FastifyStatic from "@fastify/static";
import fileHandler from '@fastify/multipart';
import type { FastifyInstance } from "fastify";
import FalAiResult from "../dto/FalAiResult.js";
import { httpServerUrls } from "bymx-core/server";
import ChatPrompt from "../dto/chat/ChatPrompt.js";
import authGuard from "../middlewares/authGuard.js";
import SetChatTitle from "../dto/chat/SetChatTitle.js";
import SetChatModel from "../dto/chat/SetChatModel.js";
import TelegramAuth from "../dto/user/TelegramAuth.js";
import ChangeLanguage from '../dto/user/ChangeLanguage.js';
import { dtoValidator } from "../middlewares/dtoValidator.js";
import TelegramOtpLogin from '../dto/user/TelegramOtpLogin.js';
import ChatMessagesQuery from "../dto/chat/ChatMessagesQuery.js";
import TelegramOtpRequest from '../dto/user/TelegramOtpRequest.js';
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

    fastifyInstance.register((fileController, _, next) => {

        fileController.addHook('onRequest', jwt);
        fileController.addHook('onRequest', authGuard);

        fileController.register(fileHandler);

        fileController.put("/upload", file.uploadAttachment);
        fileController.delete("/attachment", { preValidation: dtoValidator(IdDto) }, file.deleteAttachment);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/file" });

    fastifyInstance.register((userControllerNoAuth, _, next) => {

        userControllerNoAuth.post("/tgAuth", { preValidation: dtoValidator(TelegramAuth) }, user.telegramAuth);
        userControllerNoAuth.post("/tgOtp", { preValidation: dtoValidator(TelegramOtpRequest) }, user.sendTelegramOtp);
        userControllerNoAuth.post("/tgOtpAuth", { preValidation: dtoValidator(TelegramOtpLogin) }, user.telegramOtpAuth);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/user" });

    fastifyInstance.register((userController, _, next) => {

        userController.addHook('onRequest', jwt);
        userController.addHook('onRequest', authGuard);

        userController.get("/info", user.getInfo);
        userController.get("/me", user.getMe);
        userController.patch("/language", { preValidation: dtoValidator(ChangeLanguage) }, user.changeLanguage);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/user" });

    fastifyInstance.register((chatController, _, next) => {

        chatController.addHook('onRequest', jwt);
        chatController.addHook('onRequest', authGuard);

        chatController.get("/all", chat.getAllChats);
        chatController.delete("/", { preValidation: dtoValidator(ChatID) }, chat.deleteChat);
        chatController.get("/model", { preValidation: dtoValidator(ChatID) }, chat.getChatSelectedModel);
        chatController.patch("/model", { preValidation: dtoValidator(SetChatModel) }, chat.setChatModel);
        chatController.patch("/memory", { preValidation: dtoValidator(SetChatMemoryAmount) }, chat.setChatMemoryAmount);
        chatController.patch("/title", { preValidation: dtoValidator(SetChatTitle) }, chat.setChatTitle);
        chatController.get("/messages", { preValidation: dtoValidator(ChatMessagesQuery) }, chat.getChatMessages);
        chatController.delete("/messages", { preValidation: dtoValidator(ChatID) }, chat.clearChatHistory);
        chatController.post("/prompt", { preValidation: dtoValidator(ChatPrompt) }, chat.submitPrompt);
        chatController.get("/canICreateANewChat", chat.canCreateNewChat);
        chatController.post("/new", chat.createNewChat);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/chat" });

    fastifyInstance.register((modelController, _, next) => {

        modelController.addHook('onRequest', jwt);
        modelController.addHook('onRequest', authGuard);

        modelController.get("/all", model.getAllModels);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress + "/model" });


    fastifyInstance.register((baseController, _, next) => {

        baseController.get(`/${httpServerUrls.v1.tempFile.path}/:id`, getTempFile);

        baseController.post(`/${httpServerUrls.v1.falAiSetResult.path}/:id`, { preValidation: dtoValidator(FalAiResult) }, falAiSetResult);

        baseController.get("/uiText/:langCode", getLanguageData);

        next();
    }, { prefix: httpServerUrls.v1.baseAddress });

    fastifyInstance.setNotFoundHandler(function (_req, res) {
        void res.sendFile('index.html')
    });
};
