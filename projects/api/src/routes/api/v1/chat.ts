import type { RouteHandlerMethod } from "fastify";
import type { CaptionOnly } from "bymx-core/types";
import { OperationResultWithData } from "bymx-core/shared";

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
