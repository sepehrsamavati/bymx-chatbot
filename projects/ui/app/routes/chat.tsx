import * as PrismJS from "prismjs";
import Markdown from "react-markdown";
import { useParams } from "react-router";
import Send from "@mui/icons-material/Send";
import chatService from "~/core/services/chatService";
import type { PromptViewModel } from "bymx-core/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Card, CircularProgress, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography, type SelectChangeEvent } from "@mui/material";

// import 'prismjs/components/prism-python.min.js'; // Ensure Python is loaded
import 'prismjs/themes/prism.css';
import { useSession } from "~/core/Session";
import { AIChatHistoryMemory } from "bymx-core/shared";

const loadLanguage = (language: string, callback: Function) => {
    if (PrismJS.languages[language]) { // Already loaded
        callback();
    } else { // Load the language if it's not already loaded

        // Load the language script from a CDN
        const script = document.createElement('script');
        script.src = `https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-${language}.min.js`;
        script.onload = () => {
            callback();
            // console.log(`${language} language loaded from CDN.`);
        };
        script.onerror = () => {
            console.error(`Failed to load ${language} language from CDN.`);
        };
        document.head.appendChild(script);
    }
};

function MessageBubble(props?: {
    text?: string;
    date?: Date;
    modelTitle?: string;
}) {
    const divRef = useRef<HTMLDivElement>(null);
    const date = useMemo(() => {
        if (!props?.date) return null;

        const now = new Date();

        if (now.toLocaleDateString() !== props.date.toLocaleDateString())
            return <i>{props.date.toLocaleString()}</i>;

        return <i>{props.date.toLocaleTimeString()}</i>;
    }, [props]);

    useEffect(() => {
        if (!divRef.current) return;

        divRef.current
            .querySelectorAll("code[class^=language-]")
            .forEach(codeElement => {
                const language = codeElement.className.split('-')[1]; // Extract language name
                loadLanguage(language, () => {
                    PrismJS.highlightElement(codeElement);
                }); // Load the language dynamically
            });
    }, [props]);

    return (
        <Box
            padding={1}
            component="div"
            fontSize="inherit"
            whiteSpace="pre-line"
            sx={{
                position: "relative",
                minWidth: "20vw",
                ' p': {
                    margin: 0
                },
                ' pre': {
                    overflow: "auto",
                    direction: "ltr",
                },
            }}
        >
            <div ref={divRef}>
                <Markdown>{props?.text}</Markdown>
            </div>
            <Typography
                component="span"
                sx={{
                    bottom: 0,
                    insetInlineStart: 0,
                    position: "absolute",
                    marginBottom: -1.6,
                    fontSize: "0.6em",
                    fontFamily: "monospace",
                    color: "GrayText",
                    direction: "ltr",
                }}
            >{props?.modelTitle} {date}</Typography>
        </Box>
    );
}

export default function Chat() {
    const session = useSession();
    const { chatId } = useParams();
    const [messages, setMessages] = useState<PromptViewModel[]>([]);
    const initialized = useRef(false);
    const [inputText, setInputText] = useState("");
    const reachedToFirstMessage = useRef(false);
    const isLoadingMessages = useRef(false);
    const chatSectionRef = useRef<HTMLDivElement>(null);
    const [modelChangeLock, setModelChangeLock] = useState(true);
    const [selectedModel, setSelectedModel] = useState("");
    const [waitingForPreviousMessagesToLoad, setWaitingForPreviousMessagesToLoad] = useState(false);
    const [waitingForCompletion, setWaitingForCompletion] = useState(false);

    const scrollToBottom = useCallback((asyncCallback?: (callback: Function) => void) => {
        if (!chatSectionRef.current) return;

        const element = chatSectionRef.current;
        const scrollTopMax = element.scrollHeight - element.clientHeight;
        const shouldScroll = scrollTopMax - element.scrollTop < 100;

        if (shouldScroll) {
            const scrollFunction = () => {
                element.scrollTo({
                    top: element.scrollHeight - element.clientHeight
                });
            };
            if (asyncCallback)
                asyncCallback(scrollFunction);
            else
                scrollFunction();
        }
    }, []);

    const getMessages = useCallback(() => {
        if (!chatId || isLoadingMessages.current || reachedToFirstMessage.current) return;
        isLoadingMessages.current = true;
        setWaitingForPreviousMessagesToLoad(true);
        const lastMessageId = messages?.at(-1)?.id;
        chatService
            .getMessages({
                chatId,
                lastMessageId,
            })
            .then(res => {
                if (res.result.data)
                    setMessages(_current => {
                        const oldMessages = [..._current];
                        const newMessages = [...(res.result.data || [])].reverse();

                        for (const message of newMessages) {
                            if (oldMessages.some(m => m.id === message.id))
                                continue;
                            oldMessages.unshift(message);
                        }

                        reachedToFirstMessage.current = _current.length === oldMessages.length;

                        return oldMessages;
                    });
            })
            .finally(() => {
                isLoadingMessages.current = false;
                setWaitingForPreviousMessagesToLoad(false);
            });
    }, [chatId, messages]);

    const submitPrompt = useCallback(() => {
        if (!chatId) return;
        setWaitingForCompletion(true);
        setInputText("");
        const inputDate = Date.now();
        chatService
            .submitPrompt({
                chatId,
                promptText: inputText,
            })
            .then(res => {
                if (res.result.data) {
                    scrollToBottom(cb => setTimeout(() => cb(), 10));
                    setMessages(_current => [..._current, { id: "new", inputDate, outputDate: Date.now(), modelTitle: "", input: inputText, output: res.result.data?.plainText ?? "ERR", points: res.result.data?.pointUsage as number }]);
                }
            })
            .finally(() => setWaitingForCompletion(false));
    }, [chatId, inputText]);

    const scrollHandler: React.UIEventHandler<HTMLDivElement> = useCallback(event => {
        if ((event.target as HTMLDivElement).scrollTop === 0)
            getMessages();
    }, [getMessages]);

    const handleModelChange = useCallback((event: SelectChangeEvent<string>) => {
        if (modelChangeLock || !chatId) return;
        const modelId = event.target.value;
        setModelChangeLock(true);
        chatService
            .setChatModel({ chatId, modelId })
            .then(res => {
                if (res.result.ok)
                    setSelectedModel(modelId);
            })
            .finally(() => {
                setModelChangeLock(false);
            });
    }, [modelChangeLock, chatId]);

    useEffect(() => {
        if (initialized.current || !chatId) return;
        initialized.current = true;

        getMessages();

        chatService
            .getChatModelId(chatId)
            .then(res => {
                if (res.result.ok && res.result.data) {
                    setSelectedModel(res.result.data);
                    setModelChangeLock(false);
                }
            });
    }, [getMessages, chatId]);

    return (
        <Stack direction="column" height="100%">
            <Box textAlign="center">
                <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Select
                        disabled={modelChangeLock}
                        size="small"
                        sx={{
                            borderRadius: 50,
                            fontFamily: "monospace",
                            "> .MuiSelect-select": {
                                padding: 1,
                            }
                        }}
                        value={selectedModel}
                        onChange={handleModelChange}
                        displayEmpty
                    >
                        {session.chatModels.map(model => (
                            <MenuItem key={model.id} value={model.id} sx={{ fontFamily: "monospace", direction: "ltr", fontSize: "0.8em", padding: 1, minHeight: "unset" }}>{model.caption}</MenuItem>
                        ))}
                    </Select>

                    <FormControl
                    size="small"
                    sx={{
                        "> .MuiFormLabel-root": {
                            left: "unset",
                            right: "19px",
                        }
                    }}
                    >
                        <InputLabel size="small">{session.uiText.memory}</InputLabel>
                        <Select
                            size="small"
                            sx={{
                                borderRadius: 50,
                            }}
                            value={session.user?.saveMessages ? session.user?.memoryAmount : AIChatHistoryMemory.None}
                            label={session.uiText.memory}
                        >
                            <MenuItem value={AIChatHistoryMemory.None}>{session.uiText.disabled}</MenuItem>
                            <MenuItem value={AIChatHistoryMemory.Short}>{session.uiText.short}</MenuItem>
                            <MenuItem value={AIChatHistoryMemory.Normal}>{session.uiText.normal}</MenuItem>
                            <MenuItem value={AIChatHistoryMemory.Long}>{session.uiText.high}</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Box>

            <Stack
                flexGrow={1}
                marginTop={1}
                paddingBottom={1}
                overflow="auto"
                direction="column"
                ref={chatSectionRef}
                onScroll={scrollHandler}
            >
                {waitingForPreviousMessagesToLoad ? (
                    <Box margin={4} textAlign="center">
                        <CircularProgress color="secondary" />
                    </Box>
                ) : null}
                {messages.map(message => (
                    <Box
                        key={message.id}
                        fontSize="0.8em"
                    >
                        <Box margin={1}>
                            <Card variant="elevation" sx={{ display: "inline-block", overflow: "unset", maxWidth: "100%" }}>
                                <MessageBubble text={message.input} date={new Date(message.inputDate)} />
                            </Card>
                        </Box>
                        <Box margin={1}>
                            <Card variant="outlined" sx={{ display: "inline-block", overflow: "unset", maxWidth: "100%", float: "inline-end" }}>
                                <MessageBubble text={message.output} date={new Date(message.outputDate)} modelTitle={message.modelTitle} />
                            </Card>
                        </Box>
                    </Box>
                ))}
            </Stack>

            <Card sx={{ padding: 1, borderRadius: 0, overflow: "initial" }}>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        submitPrompt();
                    }}
                >
                    <TextField
                        fullWidth
                        size="small"
                        autoComplete="off"
                        variant="standard"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        slotProps={{
                            input: {
                                disableUnderline: true,
                                startAdornment: (
                                    <IconButton type="submit" size="small" disabled={inputText.trim().length === 0 || waitingForCompletion}>
                                        {waitingForCompletion ? <CircularProgress size="1em" color="inherit" /> : <Send />}
                                    </IconButton>
                                )
                            },
                        }}
                    />
                </form>
            </Card>
        </Stack>
    );
}