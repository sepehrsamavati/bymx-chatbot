import type { RouteHandlerMethod } from "fastify";
import { OperationResultWithData } from "bymx-core/shared";
import type { CaptionOnly, PromptViewModel } from "bymx-core/types";
import type ChatMessagesQuery from "../../../dto/chat/ChatMessagesQuery.js";
import ChatPrompt from "../../../dto/chat/ChatPrompt.js";

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
            result.succeeded().setData(messages.data);
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
