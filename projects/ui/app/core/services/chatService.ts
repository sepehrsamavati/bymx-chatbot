import HttpClient from "../helper/HttpClient";
import type { Api, CaptionOnly, PromptViewModel } from "bymx-core/types";
import type { AIChatHistoryMemory, OperationResult, OperationResultWithData } from "bymx-core/shared";

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
    clearMessages(chatId: string) {
        const queryParams = new URLSearchParams();

        queryParams.append("chatId", chatId);

        return HttpClient.send<OperationResult>({
            path: `/api/v1/chat/messages?${queryParams}`,
            method: HttpClient.Methods.DELETE,
        });
    },
    delete(chatId: string) {
        const queryParams = new URLSearchParams();

        queryParams.append("chatId", chatId);

        return HttpClient.send<OperationResult>({
            path: `/api/v1/chat?${queryParams}`,
            method: HttpClient.Methods.DELETE,
        });
    },
    getChatModelId(chatId: string) {
        const queryParams = new URLSearchParams();

        queryParams.append("chatId", chatId);

        return HttpClient.send<OperationResultWithData<string>>({
            path: `/api/v1/chat/model?${queryParams}`,
            method: HttpClient.Methods.GET,
        });
    },
    submitPrompt(dto: Api.ChatDto.ILlmPromptRequest) {
        return HttpClient.send<OperationResultWithData<Api.ChatDto.ILlmPromptResponse>>({
            path: "/api/v1/chat/prompt",
            method: HttpClient.Methods.POST,
            body: dto,
        });
    },
    setChatModel(dto: { chatId: string; modelId: string; }) {
        return HttpClient.send<OperationResult>({
            path: "/api/v1/chat/model",
            method: HttpClient.Methods.PATCH,
            body: dto,
        });
    },
    setChatTitle(dto: { chatId: string; title: string; }) {
        return HttpClient.send<OperationResult>({
            path: "/api/v1/chat/title",
            method: HttpClient.Methods.PATCH,
            body: dto,
        });
    },
    canCreateNewChat() {
        return HttpClient.send<OperationResult>({
            path: "/api/v1/chat/canICreateANewChat",
            method: HttpClient.Methods.GET,
        });
    },
    createNewChat() {
        return HttpClient.send<OperationResultWithData<string>>({
            path: "/api/v1/chat/new",
            method: HttpClient.Methods.POST,
        });
    },
    generateTitle(chatId: string) {
        return HttpClient.send<OperationResultWithData<string>>({
            path: "/api/v1/chat/generateTitle",
            method: HttpClient.Methods.POST,
            body: { chatId }
        });
    },
});

export default chatService;
