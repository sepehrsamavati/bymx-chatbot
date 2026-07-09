import chatService from "~/core/services/chatService";
import modelService from "~/core/services/modelService";
import type Session from "~/core/Session";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SelectChangeEvent } from "@mui/material";

type UseChatModelOptions = {
    chatId: string | undefined;
    isNewChat: boolean;
    session: Session;
};

export function useChatModel({ chatId, isNewChat, session }: UseChatModelOptions) {
    const [selectedModel, setSelectedModel] = useState("");
    const [modelChangeLock, setModelChangeLock] = useState(!isNewChat);
    const [modelsReadyKey, setModelsReadyKey] = useState(0);
    const initialized = useRef(false);

    const syncChatModel = useCallback((_chatId: string) => {
        chatService
            .getChatModelId(_chatId)
            .then(res => {
                if (res.result?.ok && res.result.data) {
                    setSelectedModel(res.result.data);
                    setModelChangeLock(false);
                } else {
                    session.snackbarProvider(res.result?.message, { variant: "error" });
                }
            });
    }, [session]);

    const handleModelChange = useCallback((event: SelectChangeEvent<string>) => {
        const modelId = event.target.value;

        if (isNewChat && !chatId) {
            setSelectedModel(modelId);
            return;
        }

        if (modelChangeLock || !chatId) return;

        setModelChangeLock(true);
        chatService
            .setChatModel({ chatId, modelId })
            .then(res => {
                if (res.result?.ok)
                    setSelectedModel(modelId);
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => setModelChangeLock(false));
    }, [modelChangeLock, chatId, isNewChat, session]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const timer = window.setInterval(() => {
            if (!session.chatModels.length) return;

            window.clearInterval(timer);

            if (isNewChat && !selectedModel) {
                let defaultModelId = session.chatModels.at(0)?.id || "";
                modelService
                    .getDefaultModelId()
                    .then(res => {
                        if (res.result?.data)
                            defaultModelId = res.result.data;
                    })
                    .finally(() => setSelectedModel(defaultModelId));
            }

            session.refreshUI();
            setModelsReadyKey(key => key + 1);
        }, 500);

        if (chatId)
            syncChatModel(chatId);
    }, [chatId, isNewChat, selectedModel, session, syncChatModel]);

    return {
        selectedModel,
        modelChangeLock,
        modelsReadyKey,
        handleModelChange,
        syncChatModel,
    };
}
