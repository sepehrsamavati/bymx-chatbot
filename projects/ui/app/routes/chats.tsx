import Button from "~/components/button";
import Add from "@mui/icons-material/Add";
import { useNavigate } from "react-router";
import { useSession } from "~/core/Session";
import Save from "@mui/icons-material/Save";
import Edit from "@mui/icons-material/Edit";
import Close from "@mui/icons-material/Close";
import type { CaptionOnly } from "bymx-core/types";
import chatService from "~/core/services/chatService";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, ButtonGroup, IconButton, Modal, Stack, TextField, Typography } from "@mui/material";

export default function Chats() {
    const navigate = useNavigate();
    const session = useSession();
    const initialized = useRef(false);
    const [canCreateNewChat, setCanCreateNewChat] = useState(false);
    const [creatingNewChat, setCreatingNewChat] = useState(false);
    const [titleModalOpen, setTitleModalOpen] = useState(false);
    const [settingNewTitle, setSettingNewTitle] = useState(false);
    const [newTitle, setNewTitle] = useState({ chatId: "", title: "", });
    const [chats, setChats] = useState<CaptionOnly[]>([]);

    const createNewChat = useCallback(() => {
        if (!canCreateNewChat || creatingNewChat) return;

        setCreatingNewChat(true);

        chatService
            .createNewChat()
            .then(res => {
                if (res.result?.data) {
                    navigate(`/ui/chat/${res.result.data}`);
                }
            })
            .finally(() => {
                setCreatingNewChat(false);
            });

    }, [canCreateNewChat, creatingNewChat]);

    const disposeSetTitleModal = useCallback(() => {
        setTitleModalOpen(false);
        setNewTitle({ chatId: "", title: "", });
    }, []);

    const saveNewTitle = useCallback(() => {
        if (!(newTitle.chatId || newTitle.title)) return;
        setSettingNewTitle(true);
        chatService
            .setChatTitle(newTitle)
            .then(res => {
                if (res.result?.ok) {
                    disposeSetTitleModal();
                    setChats(current => {
                        const targetChat = current.find(c => c.id === newTitle.chatId);

                        if (targetChat)
                            targetChat.caption = newTitle.title;

                        return current;
                    });
                }
            })
            .finally(() => setSettingNewTitle(false));
    }, [newTitle, disposeSetTitleModal]);

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
                if (res.result?.data)
                    setChats(res.result.data);
            });
    }, []);

    return (
        <>
            <Modal
                open={titleModalOpen}
                onClose={disposeSetTitleModal}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: "95%",
                        maxWidth: 400,
                        bgcolor: 'background.default',
                        boxShadow: 24,
                        p: 4,
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="h6" component="h2">
                        {session.uiText.changeTitle}
                    </Typography>
                    <TextField
                        fullWidth
                        value={newTitle.title}
                        onChange={e => e.target.value.length < 50 && setNewTitle(current => ({ ...current, title: e.target.value }))}
                    />
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ marginTop: 2 }}>
                        <Button
                            startIcon={<Save />}
                            onClick={saveNewTitle}
                            color="success"
                            loading={settingNewTitle}
                            disabled={newTitle.title.length === 0}
                        >{session.uiText.save}</Button>
                        <Button endIcon={<Close />} onClick={disposeSetTitleModal} color="error">{session.uiText.close}</Button>
                    </Stack>
                </Box>
            </Modal>

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
                    <Box marginInline={2}>
                        <ButtonGroup
                            fullWidth
                            key={chat.id}
                            variant="contained"
                            color="inherit"
                            sx={{
                                borderRadius: 10,
                                "> button": {
                                    borderRadius: 10,
                                }
                            }}
                        >
                            <Button fullWidth color="inherit" onClick={() => navigate(`/ui/chat/${chat.id}`)}>
                                <Box width="100%">{chat.caption || session.uiText.noTitle}</Box>
                            </Button>
                            <Button
                                fullWidth={false}
                                color="inherit"
                                onClick={() => {
                                    setNewTitle({
                                        chatId: chat.id,
                                        title: chat.caption,
                                    });
                                    setTitleModalOpen(true);
                                }}
                            >
                                <Edit />
                            </Button>
                        </ButtonGroup>
                    </Box>
                ))}
            </Stack>
        </>
    );
}