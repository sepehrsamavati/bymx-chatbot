import chatService from "~/core/services/chatService";
import type Session from "~/core/Session";
import { useStreamChunks } from "../useStreamChunks";
import { useCallback, useState } from "react";
import type { Api } from "bymx-core/types";
import type { ChatMessage, SelectedAttachmentFile } from "../types";

type UseChatComposerOptions = {
    chatId: string | undefined;
    setChatId: (id: string) => void;
    isNewChat: boolean;
    session: Session;
    selectedModel: string;
    syncChatModel: (chatId: string) => void;
    messages: ChatMessage[] | undefined;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[] | undefined>>;
    deleteMessagesAfter: (messageId: string) => ReturnType<typeof chatService.deleteMessagesAfter>;
    trimMessagesAfter: (messageId: string) => void;
    uploadingFile: SelectedAttachmentFile | undefined;
    clearAttachment: () => void;
    setUploadingFile: React.Dispatch<React.SetStateAction<SelectedAttachmentFile | undefined>>;
    scrollToBottom: (asyncCallback?: (callback: () => void) => void, force?: boolean, instant?: boolean) => void;
    scheduleScrollToBottom: (instant?: boolean) => void;
    socket: ReturnType<typeof import("~/core/services/socket").socketManager>;
};

export function useChatComposer({
    chatId,
    setChatId,
    isNewChat,
    session,
    selectedModel,
    syncChatModel,
    messages,
    setMessages,
    deleteMessagesAfter,
    trimMessagesAfter,
    uploadingFile,
    clearAttachment,
    setUploadingFile,
    scrollToBottom,
    scheduleScrollToBottom,
    socket,
}: UseChatComposerOptions) {
    const [inputText, setInputText] = useState("");
    const [waitingForCompletion, setWaitingForCompletion] = useState(false);
    const [currentlyGeneratingMessage, setCurrentlyGeneratingMessage] = useState<{ input: string }>();
    const { output: streamingOutput, appendChunk, reset: resetStreamChunks } = useStreamChunks();

    const cantSubmit = inputText.trim().length === 0 || waitingForCompletion;

    const submitPrompt = useCallback(async (text?: string) => {
        setWaitingForCompletion(true);

        let responseReturned = false;
        const finish = () => {
            responseReturned = true;
            resetStreamChunks();
            setCurrentlyGeneratingMessage(undefined);
            setWaitingForCompletion(false);
        };

        let activeChatId = chatId;

        if (!activeChatId && isNewChat) {
            const createdChatResponse = await chatService.createNewChat();

            if (!createdChatResponse.result?.data) {
                session.snackbarProvider(createdChatResponse.result?.message, { variant: "error" });
                return finish();
            }

            activeChatId = createdChatResponse.result.data;
            setChatId(activeChatId);
            window.history.pushState({}, "", `/ui/chat/${activeChatId}`);
            session.cacheStorage.chats?.data.list.unshift({ caption: "", id: activeChatId });

            if (selectedModel) {
                if (!(await chatService.setChatModel({ chatId: activeChatId, modelId: selectedModel })).result?.ok)
                    syncChatModel(activeChatId);
            }
        }

        if (!activeChatId)
            return finish();

        const promptText = text || inputText;
        const attachmentFile = text ? undefined : uploadingFile;
        const inputDate = Date.now();
        const socketConnectionId = socket.getConnectionId();
        const requestId = window.crypto.randomUUID();

        setInputText("");
        clearAttachment();

        const dto = {
            chatId: activeChatId,
            promptText,
            attachmentFileId: attachmentFile?.id,
            ...(socketConnectionId ? {
                streamSocketId: socketConnectionId,
                clientRequestId: requestId,
            } : undefined),
        } satisfies Api.ChatDto.ILlmPromptRequest;

        scrollToBottom(cb => setTimeout(() => cb(), 10), true);
        resetStreamChunks();
        setCurrentlyGeneratingMessage({ input: promptText });

        const rollback = () => {
            setInputText(promptText);
            setUploadingFile(attachmentFile);
        };

        socket.registerPromptResultHandler(requestId, result => {
            if (responseReturned)
                return { closeListener: true };

            if (result.finished && result.isComplete) {
                resetStreamChunks();
                setCurrentlyGeneratingMessage(undefined);
                return { closeListener: true };
            }

            if (!result) {
                rollback();
            } else if (result.outputChunk) {
                appendChunk(result.outputChunk.index, result.outputChunk.value);
                scheduleScrollToBottom();
            }

            return;
        });

        chatService
            .submitPrompt(dto)
            .then(response => {
                if (response.result?.data?.memoryUpdated)
                    session.snackbarProvider(session.uiText.memoryUpdate, { variant: "success" });

                const result = response.result;
                if (result?.data) {
                    scrollToBottom(cb => setTimeout(() => cb(), 10));
                    setMessages(current => [...(current || []), {
                        id: result.data?.messageId || requestId,
                        inputDate,
                        outputDate: Date.now(),
                        modelTitle: session.chatModels.find(model => model.id === selectedModel)?.title ?? "",
                        input: promptText,
                        attachmentFilename: attachmentFile?.name,
                        output: result.data?.plainText ?? "ERR",
                        points: result.data?.pointUsage as number,
                    }]);
                } else {
                    session.snackbarProvider(result?.message, { variant: "error" });
                    rollback();
                }
            })
            .finally(finish);
    }, [
        chatId,
        isNewChat,
        inputText,
        uploadingFile,
        selectedModel,
        session,
        socket,
        setChatId,
        syncChatModel,
        setMessages,
        clearAttachment,
        setUploadingFile,
        scrollToBottom,
        scheduleScrollToBottom,
        appendChunk,
        resetStreamChunks,
    ]);

    const regenerate = useCallback((message: ChatMessage) => {
        if (!messages?.length) return;

        if (messages.length === 1) {
            submitPrompt(session.uiText._prompt_didNotUnderstand);
            return;
        }

        setWaitingForCompletion(true);
        deleteMessagesAfter(message.id)
            .then(res => {
                if (res.result?.ok) {
                    trimMessagesAfter(message.id);
                    submitPrompt(message.input);
                } else {
                    setWaitingForCompletion(false);
                    session.snackbarProvider(res.result?.message, { variant: "error" });
                }
            });
    }, [messages, session, deleteMessagesAfter, trimMessagesAfter, submitPrompt]);

    return {
        inputText,
        setInputText,
        waitingForCompletion,
        cantSubmit,
        currentlyGeneratingMessage,
        streamingOutput,
        submitPrompt,
        regenerate,
    };
}
