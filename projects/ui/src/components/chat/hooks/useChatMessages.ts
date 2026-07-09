import chatService from "~/core/services/chatService";
import type Session from "~/core/Session";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { autoScrollThreshold, type ChatMessage } from "../types";

type UseChatMessagesOptions = {
    chatId: string | undefined;
    isNewChat: boolean;
    session: Session;
};

export function useChatMessages({ chatId, isNewChat, session }: UseChatMessagesOptions) {
    const [messages, setMessages] = useState<ChatMessage[] | undefined>(isNewChat ? [] : undefined);
    const [waitingForPreviousMessagesToLoad, setWaitingForPreviousMessagesToLoad] = useState(false);

    const chatSectionRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const reachedToFirstMessage = useRef(false);
    const isLoadingMessages = useRef(false);
    const autoScrollEnabled = useRef(true);
    const scrollRafRef = useRef<number | undefined>(undefined);
    const needsInitialScrollRef = useRef(!isNewChat);
    const initialScrollDoneRef = useRef(isNewChat);
    const pendingScrollRestoreRef = useRef<number | null>(null);
    const pendingScrollToBottomRef = useRef(false);

    const scrollToBottomInstant = useCallback(() => {
        const container = chatSectionRef.current;
        if (!container) return;

        container.scrollTop = container.scrollHeight - container.clientHeight;
        messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    }, []);

    const scrollToBottom = useCallback((
        asyncCallback?: (callback: () => void) => void,
        force = false,
        instant = false,
    ) => {
        if (!chatSectionRef.current) return;

        const shouldScroll = force || autoScrollEnabled.current;
        if (!shouldScroll) return;

        const scrollFunction = () => {
            if (instant)
                scrollToBottomInstant();
            else
                chatSectionRef.current?.scrollTo({
                    top: chatSectionRef.current.scrollHeight - chatSectionRef.current.clientHeight,
                    behavior: "smooth",
                });
        };

        if (asyncCallback)
            asyncCallback(scrollFunction);
        else
            scrollFunction();
    }, [scrollToBottomInstant]);

    const scheduleScrollToBottom = useCallback((instant = true) => {
        if (scrollRafRef.current)
            cancelAnimationFrame(scrollRafRef.current);

        scrollRafRef.current = requestAnimationFrame(() => {
            scrollToBottom(undefined, false, instant);
        });
    }, [scrollToBottom]);

    const prepareForMessageLoad = useCallback((loadingOlder: boolean) => {
        const container = chatSectionRef.current;

        if (loadingOlder && container && initialScrollDoneRef.current) {
            const isPagination = container.scrollHeight > container.clientHeight;
            if (isPagination)
                pendingScrollRestoreRef.current = container.scrollHeight;
            else
                pendingScrollToBottomRef.current = true;
        } else if (!loadingOlder) {
            needsInitialScrollRef.current = true;
            initialScrollDoneRef.current = false;
        }
    }, []);

    const getMessages = useCallback(() => {
        if (!chatId || isLoadingMessages.current || reachedToFirstMessage.current) return;

        const lastMessageId = messages?.at(0)?.id;
        prepareForMessageLoad(Boolean(lastMessageId));

        isLoadingMessages.current = true;
        setWaitingForPreviousMessagesToLoad(true);

        chatService
            .getMessages({ chatId, lastMessageId })
            .then(res => {
                if (res.result?.data) {
                    setMessages(current => {
                        current ||= [];
                        const oldMessages = [...current];
                        const messagesToAdd = [...(res.result?.data || [])]
                            .filter(message => !oldMessages.some(m => m.id === message.id));

                        const newMessages = [...messagesToAdd, ...oldMessages];
                        reachedToFirstMessage.current = current.length === newMessages.length;
                        return newMessages;
                    });
                } else {
                    session.snackbarProvider(res.result?.message, { variant: "error" });
                }
            })
            .finally(() => {
                isLoadingMessages.current = false;
                setWaitingForPreviousMessagesToLoad(false);
            });
    }, [chatId, messages, session, prepareForMessageLoad]);

    const scrollHandler: React.UIEventHandler<HTMLDivElement> = useCallback(event => {
        if (initialScrollDoneRef.current && (event.target as HTMLDivElement).scrollTop === 0)
            getMessages();

        if (chatSectionRef.current)
            autoScrollEnabled.current =
                chatSectionRef.current.scrollTop + chatSectionRef.current.clientHeight >=
                chatSectionRef.current.scrollHeight - autoScrollThreshold;
    }, [getMessages]);

    const clearMessages = useCallback(() => {
        reachedToFirstMessage.current = true;
        setMessages([]);
    }, []);

    const deleteMessagesAfter = useCallback((messageId: string) => {
        return chatService.deleteMessagesAfter(chatId!, messageId);
    }, [chatId]);

    const trimMessagesAfter = useCallback((messageId: string) => {
        setMessages(current => {
            current ||= [];
            const index = current.findIndex(m => m.id === messageId);
            return index === -1 ? current : current.slice(0, index);
        });
    }, []);

    useEffect(() => {
        if (!initialScrollDoneRef.current || !chatSectionRef.current)
            return;

        if (reachedToFirstMessage.current || !messages?.length)
            return;

        const container = chatSectionRef.current;
        const notScrollable = container.scrollHeight <= container.getBoundingClientRect().height;
        if (notScrollable)
            getMessages();
    }, [getMessages, messages]);

    useLayoutEffect(() => {
        const container = chatSectionRef.current;
        if (!container || !messages?.length || waitingForPreviousMessagesToLoad)
            return;

        if (pendingScrollRestoreRef.current !== null) {
            const previousScrollHeight = pendingScrollRestoreRef.current;
            pendingScrollRestoreRef.current = null;
            container.scrollTop = container.scrollHeight - previousScrollHeight;
            return;
        }

        const shouldScrollToBottom =
            needsInitialScrollRef.current
            || pendingScrollToBottomRef.current;

        if (!shouldScrollToBottom)
            return;

        pendingScrollToBottomRef.current = false;

        const applyScroll = () => scrollToBottomInstant();
        applyScroll();

        let debounceTimer: number | undefined;
        const resizeObserver = new ResizeObserver(() => {
            applyScroll();
            if (debounceTimer)
                clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                needsInitialScrollRef.current = false;
                initialScrollDoneRef.current = true;
                resizeObserver.disconnect();
            }, 120);
        });
        resizeObserver.observe(container);

        const maxTimer = window.setTimeout(() => {
            applyScroll();
            needsInitialScrollRef.current = false;
            initialScrollDoneRef.current = true;
            resizeObserver.disconnect();
        }, 800);

        return () => {
            if (debounceTimer)
                clearTimeout(debounceTimer);
            clearTimeout(maxTimer);
            resizeObserver.disconnect();
        };
    }, [messages, waitingForPreviousMessagesToLoad, scrollToBottomInstant]);

    return {
        messages,
        setMessages,
        waitingForPreviousMessagesToLoad,
        isLoadingMessages,
        chatSectionRef,
        messagesEndRef,
        scrollHandler,
        scrollToBottom,
        scheduleScrollToBottom,
        getMessages,
        clearMessages,
        deleteMessagesAfter,
        trimMessagesAfter,
    };
}
