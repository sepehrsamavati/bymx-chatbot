import * as PrismJS from "prismjs";
import Markdown from "react-markdown";
import { useParams } from "react-router";
import Send from "@mui/icons-material/Send";
import chatService from "~/core/services/chatService";
import type { PromptViewModel } from "bymx-core/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Card, CircularProgress, IconButton, Stack, TextField } from "@mui/material";

// import 'prismjs/components/prism-python.min.js'; // Ensure Python is loaded
import 'prismjs/themes/prism.css';

const loadLanguage = (language: string, callback: Function) => {
    // Only load the language if it's not already loaded
    if (!PrismJS.languages[language]) {

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

        // import(`prismjs/components/prism-${language}.min.js`)
        //     .then(() => {
        //         console.log(`${language} language loaded successfully.`);
        //     })
        //     .catch((err) => {
        //         console.error(`Error loading ${language}:`, err);
        //     });
    }
};

function MessageBubble(props?: {
    text?: string;
}) {
    const divRef = useRef<HTMLDivElement>(null);
    // const lines = (props?.text ?? "").split('\n');

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
    }, []);

    return (
        <Box
            padding={1}
            component="div"
            fontSize="inherit"
            whiteSpace="pre-line"
            sx={{
                ' p': {
                    margin: 0
                },
                ' pre': {
                    overflow: "auto",
                    direction: "ltr",
                },
            }}
        >
            {/* {lines.map(line => <Typography fontSize="inherit">{line}</Typography>)} */}
            <div ref={divRef}>
                <Markdown>{props?.text}</Markdown>
            </div>
        </Box>
    );
}

export default function Chat() {
    const { chatId } = useParams();
    const [messages, setMessages] = useState<PromptViewModel[]>([]);
    const initialized = useRef(false);
    const [inputText, setInputText] = useState("");
    const reachedToFirstMessage = useRef(false);
    const isLoadingMessages = useRef(false);
    const chatSectionRef = useRef<HTMLDivElement>(null);
    const [waitingForCompletion, setWaitingForCompletion] = useState(false);

    useEffect(() => {
        if (!chatSectionRef.current) return;

        console.log(chatSectionRef.current.scrollHeight, chatSectionRef.current.scrollTop)

        if (chatSectionRef.current.scrollHeight - chatSectionRef.current.scrollTop < 50)
            chatSectionRef.current.scrollTo({
                top: chatSectionRef.current.scrollHeight
            });
    }, [messages]);

    const getMessages = useCallback(() => {
        if (!chatId || isLoadingMessages.current || reachedToFirstMessage.current) return;
        isLoadingMessages.current = true;
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
            });
    }, [chatId, messages]);

    const submitPrompt = useCallback(() => {
        if (!chatId) return;
        setWaitingForCompletion(true);
        setInputText("");
        chatService
            .submitPrompt({
                chatId,
                promptText: inputText,
            })
            .then(res => {
                if (res.result.data)
                    setMessages(_current => [..._current, { id: "new", input: inputText, output: res.result.data?.plainText ?? "ERR", points: res.result.data?.pointUsage as number }]);
            })
            .finally(() => setWaitingForCompletion(false));
    }, [chatId, inputText]);

    const scrollHandler: React.UIEventHandler<HTMLDivElement> = useCallback(event => {
        if ((event.target as HTMLDivElement).scrollTop === 0)
            getMessages();
    }, [getMessages]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;
        getMessages();
    }, [getMessages]);

    return (
        <Stack direction="column" height="100%">
            <Box />

            <Stack
                flexGrow={1}
                paddingBottom={1}
                overflow="auto"
                direction="column"
                ref={chatSectionRef}
                onScroll={scrollHandler}
            >
                {messages.map(message => (
                    <Box
                        key={message.id}
                        fontSize="0.8em"
                    >
                        <Box margin={1}>
                            <Card variant="elevation" sx={{ display: "inline-block", maxWidth: "100%" }}>
                                <MessageBubble text={message.input} />
                            </Card>
                        </Box>
                        <Box margin={1}>
                            <Card variant="outlined" sx={{ display: "inline-block", maxWidth: "100%", float: "inline-end" }}>
                                <MessageBubble text={message.output} />
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
                        variant="standard"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        slotProps={{
                            input: {
                                disableUnderline: true,
                                startAdornment: (
                                    <IconButton type="submit" size="small" disabled={waitingForCompletion}>
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