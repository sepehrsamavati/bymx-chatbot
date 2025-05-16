import Button from "~/components/button";
import Add from "@mui/icons-material/Add";
import { useNavigate } from "react-router";
import { useSession } from "~/core/Session";
import Save from "@mui/icons-material/Save";
import Edit from "@mui/icons-material/Edit";
import Close from "@mui/icons-material/Close";
import type { CaptionOnly } from "bymx-core/types";
import chatService from "~/core/services/chatService";
import AccountCircle from "@mui/icons-material/AccountCircle";
import fluxSampleImage from "../assets/images/flux-sample.png";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, ButtonGroup, Card, CardActions, CardMedia, Chip, Divider, Grid, Modal, Skeleton, Stack, TextField, Typography } from "@mui/material";
import generativeAiService from "~/core/services/generativeAiService";

const generateChatsTitle = (
    chatIds: string[],
    onSuccess: (chatId: string, title: string) => void,
    onComplete: () => void,
) => {
    (async () => {
        for (const chatId of chatIds) {
            try {
                const res = await chatService.generateTitle(chatId);
                if (res.result?.data)
                    onSuccess(chatId, res.result.data);
            } catch (err) {
                console.error(err);
            }
        }
        onComplete();
    })();
};

export default function Chats() {
    const navigate = useNavigate();
    const session = useSession();
    const initialized = useRef(false);
    const [canCreateNewChat, setCanCreateNewChat] = useState(false);
    const [creatingNewChat, setCreatingNewChat] = useState(false);
    const [titleModalOpen, setTitleModalOpen] = useState(false);
    const [settingNewTitle, setSettingNewTitle] = useState(false);
    const [imageGenerateCost, setImageGenerateCost] = useState<number>();
    const [newTitle, setNewTitle] = useState({ chatId: "", title: "", });
    const [chats, setChats] = useState<CaptionOnly[]>([]);
    const isGeneratingChatTitle = useRef(false);

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

        generativeAiService
            .getImageGeneratePointUsage()
            .then(res => {
                if (typeof res.result?.data === "number")
                    setImageGenerateCost(res.result.data);
            });

        chatService
            .getAll()
            .then(res => {
                if (res.result?.data) {

                    setChats(res.result.data);

                    session.localStorage.data.chatCount = res.result.data.length;
                    session.localStorage.rewrite();

                    if (!isGeneratingChatTitle.current) {
                        isGeneratingChatTitle.current = true;
                        generateChatsTitle(
                            res.result.data.filter(chat => chat.caption === "").map(chat => chat.id),
                            (chatId, title) => {
                                setChats(current => {
                                    const chatIndex = current.findIndex(chat => chat.id === chatId);
                                    if (chatIndex === -1) return current;

                                    current[chatIndex].caption = title;

                                    return [...current];
                                });
                            },
                            () => {
                                isGeneratingChatTitle.current = false;
                            },
                        );
                    }
                }
            });
    }, [session]);

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

            <Stack alignItems="center">
                <Stack direction="column" width="100%" maxWidth="700px" marginTop={5} gap={1}>
                    <Stack direction="column" alignItems="center" justifyContent="center">
                        <Button size="large" variant="outlined" color="inherit" sx={{ borderRadius: "10em" }} startIcon={<AccountCircle />} onClick={() => session.requestSideMenuOpen?.()}>{session.uiText.profile}</Button>
                    </Stack>
                    {chats.length === 0 || canCreateNewChat ? (
                        <Button
                            color="success"
                            variant="outlined"
                            onClick={createNewChat}
                            isLoading={creatingNewChat}
                            startIcon={<Add />}
                            disabled={!canCreateNewChat}
                            sx={{
                                margin: 2,
                                borderRadius: 10,
                            }}
                        >{session.uiText.newChat}</Button>
                    ) : null}


                    {chats.length === 0 ? new Array(session.localStorage.data.chatCount).fill(null).map((_, index) => (
                        <Box key={index} marginInline={2}>
                            <Skeleton animation="wave" variant="rectangular" width="100%" sx={{ padding: 2.5, borderRadius: "10em" }} />
                        </Box>
                    )) : null}

                    {chats.map(chat => (
                        <Box key={chat.id} marginInline={2}>
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
                                    <Box width="100%" textTransform="initial">{chat.caption || session.uiText.noTitle}</Box>
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

                    <Divider sx={{ marginBlock: 6 }} />

                    <Grid container paddingInline={8} marginBottom={4} justifyContent="center">
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Card onClick={() => navigate("/ui/imageGenerate")} sx={{ cursor: "pointer" }}>
                                <CardMedia component="img" src={fluxSampleImage} />
                                <CardActions>
                                    <Stack sx={{ width: "100%" }} direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between">
                                        <Button onClick={() => navigate("/ui/imageGenerate")} size="small" variant="text" color="warning">{session.uiText.createPicture}</Button>
                                        {typeof imageGenerateCost === "number" ? <Chip size="small" label={<>{imageGenerateCost} ⚡</>} /> : null}
                                    </Stack>
                                </CardActions>
                            </Card>
                        </Grid>
                    </Grid>
                </Stack>
            </Stack>
        </>
    );
}