import type { RouteHandlerMethod } from "fastify";
import { OperationResultWithData } from "bymx-core/shared";
import type { CaptionOnly, PromptViewModel } from "bymx-core/types";
import type ChatMessagesQuery from "../../../dto/ChatMessagesQuery.js";

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
