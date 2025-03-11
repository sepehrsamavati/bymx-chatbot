import HttpClient from "../helper/HttpClient";
import type { CaptionOnly, PromptViewModel } from "bymx-core/types";
import type { OperationResultWithData } from "bymx-core/shared";

const chatService = Object.freeze({
    getAll() {
        return HttpClient.send<OperationResultWithData<CaptionOnly[]>>({
            path: "/api/v1/chat/all",
            method: HttpClient.Methods.GET,
        });
    },
    getMessages(dto: { chatId: string; lastMessageId?: string; }) {
        const queryParams = new URLSearchParams();

        queryParams.append("chatId", dto.chatId);

        if (dto.lastMessageId)
            queryParams.append("lastMessageId", dto.lastMessageId);

        return HttpClient.send<OperationResultWithData<PromptViewModel[]>>({
            path: `/api/v1/chat/messages?${queryParams}`,
            method: HttpClient.Methods.GET,
        });
    },
    submitPrompt(dto: { chatId: string; promptText: string; }) {
        return HttpClient.send<OperationResultWithData<{ plainText?: string; isComplete: boolean; pointUsage: number; }>>({
            path: "/api/v1/chat/prompt",
            method: HttpClient.Methods.POST,
            body: dto,
        });
    },
});

export default chatService;
