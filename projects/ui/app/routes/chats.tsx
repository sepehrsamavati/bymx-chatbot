import { Link } from "react-router";
import { useSession } from "~/core/Session";
import { Card, Stack } from "@mui/material";
import type { CaptionOnly } from "bymx-core/types";
import { useEffect, useRef, useState } from "react";
import chatService from "~/core/services/chatService";

export default function Chats() {
    const session = useSession();
    const initialized = useRef(false);
    const [inputText, setInputText] = useState("");
    const [chats, setChats] = useState<CaptionOnly[]>([]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        chatService
            .getAll()
            .then(res => {
                if (res.result.data)
                    setChats(res.result.data);
            });
    }, []);

    return (
        <Stack direction="column" height="100%" marginTop={5}>
            {chats.map(chat => (
                <Link key={chat.id} to={`/ui/chat/${chat.id}`}>
                    <Card sx={{ margin: 2, padding: 1, borderRadius: 10 }}>
                        {chat.caption || session.uiText.noTitle}
                    </Card>
                </Link>
            ))}
        </Stack>
    );
}