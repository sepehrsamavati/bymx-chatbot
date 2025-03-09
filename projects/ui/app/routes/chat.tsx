import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import chatService from "~/core/services/chatService";
import type { PromptViewModel } from "bymx-core/types";
import { Box, Card, Stack, TextField, Typography } from "@mui/material";

export default function Chat() {
    const { chatId } = useParams();
    const [messages, setMessages] = useState<PromptViewModel[]>([]);

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

    useEffect(() => {
        getMessages();
    }, [getMessages]);

    return (
        <Stack direction="column" height="100%">
            <Box />

            <Stack
                flexGrow={1}
                direction="column"
            >
                {messages.map(message => (
                    <Box
                        fontSize="0.8em"
                    >
                        <Box margin={1}>
                            <Card variant="elevation">
                                <Typography fontSize="inherit" padding={1}>{message.input}</Typography>
                            </Card>
                        </Box>
                        <Box margin={1}>
                            <Card variant="outlined">
                                <Typography fontSize="inherit" padding={1}>{message.output}</Typography>
                            </Card>
                        </Box>
                    </Box>
                ))}
            </Stack>

            <Card sx={{ margin: 2, borderRadius: 50 }}>
                <TextField variant="outlined" fullWidth size="small" />
            </Card>
        </Stack>
    );
}