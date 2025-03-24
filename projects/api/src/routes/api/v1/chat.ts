import type { RouteHandlerMethod } from "fastify";
import type ChatID from "../../../dto/chat/ChatID.js";
import { OperationResult, OperationResultWithData } from "bymx-core/shared";
import type ChatPrompt from "../../../dto/chat/ChatPrompt.js";
import type SetChatModel from "../../../dto/chat/SetChatModel.js";
import type { CaptionOnly, PromptViewModel } from "bymx-core/types";
import type ChatMessagesQuery from "../../../dto/chat/ChatMessagesQuery.js";
import SetChatMemoryAmount from "../../../dto/chat/SetChatMemoryAmount.js";

export const getAllChats: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<CaptionOnly[]>();

    const userId = request.locals.user?.id;

    if (!userId)
        result.failed("userNotFound");
    else {
        const chats = await request.locals.applications.aiChatApplication.getVisibleChats(userId);

        if (chats)
            result.succeeded().setData(chats);
        else
            result.failed("errorWhileFetchingData");
    }

    return reply.status(200).send(result);

};

export const getChatMessages: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<PromptViewModel[]>();

    const userId = request.locals.user?.id as string;
    const query = request.locals.dto as ChatMessagesQuery;

    const chat = await request.locals.applications.aiChatApplication.getUserChatById(userId, query.chatId);

    if (!chat)
        result.failed("itemNotFound");
    else {
        const messages = await request.locals.applications.aiChatApplication.getLastMessages(
            query.chatId,
            query.lastMessageId,
            5
        );

        if (messages.data)
            result.succeeded().setData(messages.data.reverse());
    }

    return reply.status(200).send(result);

};

export const submitPrompt: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<{ plainText?: string; isComplete: boolean; pointUsage: number; }>();

    const userId = request.locals.user?.id as string;
    const query = request.locals.dto as ChatPrompt;
    const user = await request.locals.applications.userApplication.getUserById(userId);

    if (!user)
        return reply.status(200).send(result.failed("userNotFound"));

    const chat = await request.locals.applications.aiChatApplication.getUserChatById(user.id, query.chatId);


    if (!chat)
        result.failed("itemNotFound");
    else {
        user.voiceResponse.on = false; // not supported
        user.selectedChat = { ...chat, user };
        const chatCompletionResult = await request.locals.applications.aiApplication.multiModalChatCompletion(user, { text: query.promptText }, {});

        if (chatCompletionResult.ok && chatCompletionResult.data)
            result
                .succeeded()
                .setData({
                    isComplete: chatCompletionResult.data.isComplete,
                    plainText: chatCompletionResult.data.plainText,
                    pointUsage: chatCompletionResult.data.pointUsage,
                });
        else
            result.failed(chatCompletionResult.message);
    }

    return reply.status(200).send(result);

};

export const getChatSelectedModel: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<string>();

    const userId = request.locals.user?.id as string;
    const query = request.locals.dto as ChatID;

    const chat = await request.locals.applications.aiChatApplication.getUserChatById(userId, query.chatId);

    if (!chat)
        result.failed("itemNotFound");
    else {
        result.succeeded().setData(chat.model.id);
    }

    return reply.status(200).send(result);

};

export const setChatModel: RouteHandlerMethod = async (request, reply) => {

    let result = new OperationResult();

    const userId = request.locals.user?.id as string;
    const query = request.locals.dto as SetChatModel;

    const chat = await request.locals.applications.aiChatApplication.getUserChatById(userId, query.chatId);

    const user = await request.locals.applications.userApplication.getUserById(userId);

    if (!user)
        return reply.status(200).send(result.failed("userNotFound"));

    if (!chat)
        result.failed("itemNotFound");
    else
        result = await request.locals.applications.aiChatApplication.setModel({ user, ...chat }, query.modelId);

    return reply.status(200).send(result);

};

export const setChatMemoryAmount: RouteHandlerMethod = async (request, reply) => {

    let result = new OperationResult();

    const userId = request.locals.user?.id as string;
    const query = request.locals.dto as SetChatMemoryAmount;

    const chat = await request.locals.applications.aiChatApplication.getUserChatById(userId, query.chatId);

    if (!chat)
        result.failed("itemNotFound");
    else
        result = await request.locals.applications.userApplication.setMemoryAmount(userId, query.amount, true);

    return reply.status(200).send(result);

};
