import { useMemo, useRef, useState } from "react";
import { useSession } from "~/core/Session";
import { socketManager } from "~/core/services/socket";
import { useChatMessages } from "./useChatMessages";
import { useChatAttachment } from "./useChatAttachment";
import { useChatModel } from "./useChatModel";
import { useChatComposer } from "./useChatComposer";
import { useChatBootstrap, usePrismTheme } from "./useChatEffects";

export function useChat(chatIdParam: string | undefined) {
    const session = useSession();
    const isNewChat = useRef(!chatIdParam);
    const [chatId, setChatId] = useState(chatIdParam);
    const socket = useMemo(() => socketManager(), []);

    const messages = useChatMessages({
        chatId,
        isNewChat: isNewChat.current,
        session,
    });

    const attachment = useChatAttachment(session);

    const model = useChatModel({
        chatId,
        isNewChat: isNewChat.current,
        session,
    });

    const composer = useChatComposer({
        chatId,
        setChatId,
        isNewChat: isNewChat.current,
        session,
        selectedModel: model.selectedModel,
        syncChatModel: model.syncChatModel,
        messages: messages.messages,
        setMessages: messages.setMessages,
        deleteMessagesAfter: messages.deleteMessagesAfter,
        trimMessagesAfter: messages.trimMessagesAfter,
        uploadingFile: attachment.uploadingFile,
        clearAttachment: attachment.clearAttachment,
        setUploadingFile: attachment.setUploadingFile,
        scrollToBottom: messages.scrollToBottom,
        scheduleScrollToBottom: messages.scheduleScrollToBottom,
        socket,
    });

    useChatBootstrap(chatId, messages.getMessages);
    usePrismTheme(session);

    return {
        session,
        isNewChat: isNewChat.current,
        chatId,
        ...messages,
        ...attachment,
        ...model,
        ...composer,
    };
}
