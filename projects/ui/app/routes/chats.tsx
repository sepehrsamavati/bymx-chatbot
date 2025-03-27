import Button from "~/components/button";
import Add from "@mui/icons-material/Add";
import { useSession } from "~/core/Session";
import { Card, Stack } from "@mui/material";
import { Link, useNavigate } from "react-router";
import type { CaptionOnly } from "bymx-core/types";
import chatService from "~/core/services/chatService";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Chats() {
    const navigate = useNavigate();
    const session = useSession();
    const initialized = useRef(false);
    const [canCreateNewChat, setCanCreateNewChat] = useState(false);
    const [creatingNewChat, setCreatingNewChat] = useState(false);
    const [chats, setChats] = useState<CaptionOnly[]>([]);

    const createNewChat = useCallback(() => {
        if (!canCreateNewChat || creatingNewChat) return;

        setCreatingNewChat(true);

        chatService
            .createNewChat()
            .then(res => {
                if (res.result.data) {
                    navigate(`/ui/chat/${res.result.data}`);
                }
            })
            .finally(() => {
                setCreatingNewChat(false);
            });

    }, [canCreateNewChat, creatingNewChat]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        chatService
            .canCreateNewChat()
            .then(res => {
                if (res.result)
                    setCanCreateNewChat(res.result.ok);
            });

        chatService
            .getAll()
            .then(res => {
                if (res.result.data)
                    setChats(res.result.data);
            });
    }, []);

    return (
        <Stack direction="column" height="100%" marginTop={5} gap={1}>
            {canCreateNewChat ? (
                <Button
                    color="success"
                    variant="outlined"
                    onClick={createNewChat}
                    isLoading={creatingNewChat}
                    startIcon={<Add />}
                    sx={{
                        margin: 2,
                        borderRadius: 10,
                    }}
                >{session.uiText.newChat}</Button>
            ) : null}
            {chats.map(chat => (
                <Button
                    key={chat.id}
                    type="button"
                    onClick={() => navigate(`/ui/chat/${chat.id}`)}
                    sx={{ marginInline: 2, borderRadius: 10 }}
                >
                    {chat.caption || session.uiText.noTitle}
                </Button>
            ))}
        </Stack>
    );
}