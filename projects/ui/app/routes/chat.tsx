import { useParams } from "react-router";
import Send from "@mui/icons-material/Send";
import chatService from "~/core/services/chatService";
import type { PromptViewModel } from "bymx-core/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Card, CircularProgress, IconButton, Stack, TextField, Typography } from "@mui/material";

function MessageBubble(props?: {
    text?: string;
}) {
    const lines = (props?.text ?? "").split('\n');

    return (
        <Typography fontSize="inherit" padding={1} whiteSpace="pre-line">
            {lines.map(line => <Typography fontSize="inherit">{line}</Typography>)}
        </Typography>
    );
}

export default function Chat() {
    const { chatId } = useParams();
    const [messages, setMessages] = useState<PromptViewModel[]>([]);
    const initialized = useRef(false);
    const [inputText, setInputText] = useState("");
    const [waitingForCompletion, setWaitingForCompletion] = useState(false);

    const getMessages = useCallback(() => {
        if (!chatId) return;
        const lastMessageId = messages?.at(-1)?.id;
        chatService
            .getMessages({
                chatId,
                lastMessageId,
            })
            .then(res => {
                if (res.result.data)
                    setMessages(_current => [...(res.result.data || []), ..._current]);
            });
    }, [chatId]);

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
        console.log(event.target)
    }, []);

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
                onScroll={scrollHandler}
            >
                {messages.map(message => (
                    <Box
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