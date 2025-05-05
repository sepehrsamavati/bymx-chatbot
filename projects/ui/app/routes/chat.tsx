import * as PrismJS from "prismjs";
import Markdown from "react-markdown";
import { useSession } from "~/core/Session";
import Send from "@mui/icons-material/Send";
import ClearAll from "@mui/icons-material/ClearAll";
import MoreVert from "@mui/icons-material/MoreVert";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { useNavigate, useParams } from "react-router";
import chatService from "~/core/services/chatService";
import fileService from "~/core/services/fileService";
import type { PromptViewModel } from "bymx-core/types";
import AttachFile from "@mui/icons-material/AttachFile";
import UploadFile from "@mui/icons-material/UploadFile";
import FreeModelIcon from "@mui/icons-material/MoneyOff";
import CostlyModelIcon from "@mui/icons-material/AttachMoney";
import DeleteForever from "@mui/icons-material/DeleteForever";
import { AIChatHistoryMemory, stringHelper } from "bymx-core/shared";
import { errorResponseMessageFormatter } from "~/core/helper/HttpClient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Card, Chip, CircularProgress, FormControl, Icon, IconButton, InputLabel, ListItemIcon, Menu, MenuItem, Select, Stack, TextField, Typography, type SelectChangeEvent } from "@mui/material";

type ChatMessage = PromptViewModel & {
    attachmentFilename?: string;
};

type AttachmentFile = {
    id: string;
    name: string;
};

type SelectedAttachmentFile = {
    id?: string;
    /** 0-100 */
    uploadedAmount: number;
    name: AttachmentFile['name'];
};

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

function ChatMoreActions(props: {
    chatId: string;
    onClearMessage: () => void;
}) {
    const session = useSession();
    const navigate = useNavigate();
    const [deletingChat, setDeletingChat] = useState(false);
    const [clearingHistory, setClearingHistory] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const clearHistory = useCallback(() => {
        handleClose();
        setClearingHistory(true);
        chatService
            .clearMessages(props?.chatId as string)
            .then(res => {
                if (res.result?.ok)
                    props?.onClearMessage?.();
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => setClearingHistory(false));
    }, [props]);

    const deleteChat = useCallback(() => {
        setDeletingChat(true);
        chatService
            .delete(props?.chatId as string)
            .then(res => {
                if (res.result?.ok)
                    navigate("/ui/chats");
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => setDeletingChat(false));
    }, [props, navigate]);

    if (!props?.chatId)
        return null;

    return (
        <div>
            <IconButton
                aria-label="more"
                id="chat-actions-button"
                aria-controls={open ? 'chat-actions-menu' : undefined}
                aria-expanded={open ? 'true' : undefined}
                aria-haspopup="true"
                onClick={handleClick}
            >
                <MoreVert />
            </IconButton>
            <Menu
                id="chat-actions-menu"
                //   MenuListProps={{
                //     'aria-labelledby': 'chat-actions-button',
                //   }}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
            //   slotProps={{
            //     paper: {
            //       style: {
            //         maxHeight: ITEM_HEIGHT * 4.5,
            //         width: '20ch',
            //       },
            //     },
            //   }}
            >
                <MenuItem disabled={clearingHistory} onClick={clearHistory}>
                    <ListItemIcon>
                        <ClearAll fontSize="small" />
                    </ListItemIcon>
                    {session.uiText.clearCurrentChatHistory}
                </MenuItem>
                <MenuItem disabled={deletingChat} onClick={deleteChat}>
                    <ListItemIcon color="red">
                        <DeleteForever fontSize="small" />
                    </ListItemIcon>
                    {session.uiText.delete}
                </MenuItem>
            </Menu>
        </div>
    );
}

function MessageBubble(props?: {
    text?: string;
    date?: Date;
    attachmentFilename?: string;
    pointUsage?: number;
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
            .querySelectorAll('p')
            .forEach(paragraphElement => {
                if (stringHelper.isRtl(paragraphElement.innerText.trimStart()))
                    paragraphElement.dir = "rtl";
                else
                    paragraphElement.dir = "ltr";
            });

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
                ' p': {
                    margin: 0
                },
                ' pre': {
                    overflow: "auto",
                    direction: "rtl",
                    borderRadius: 2,
                },
            }}
        >
            <div ref={divRef}>
                <Markdown>{props?.text}</Markdown>

                {props?.attachmentFilename ? (
                    <Chip
                        disabled
                        size="small"
                        icon={<AttachFile />}
                        label={props.attachmentFilename}
                    />
                ) : null}
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
                    direction: "rtl",
                }}
            >{props?.modelTitle} {date}{typeof props?.pointUsage === "number" ? ` ⚡${props.pointUsage}` : ''}</Typography>
        </Box>
    );
}

export default function Chat() {
    const session = useSession();
    const navigate = useNavigate();
    const { chatId } = useParams();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const initialized = useRef(false);
    const didFirstScrollToBottom = useRef(false);
    const [inputText, setInputText] = useState("");
    const reachedToFirstMessage = useRef(false);
    const isLoadingMessages = useRef(false);
    const chatSectionRef = useRef<HTMLDivElement>(null);
    const [uploadingFile, setUploadingFile] = useState<SelectedAttachmentFile>();
    const [modelChangeLock, setModelChangeLock] = useState(true);
    const [memoryAmountChangeLock, setMemoryAmountChangeLock] = useState(false);
    const [selectedModel, setSelectedModel] = useState("");
    const [waitingForPreviousMessagesToLoad, setWaitingForPreviousMessagesToLoad] = useState(false);
    const [waitingForCompletion, setWaitingForCompletion] = useState(false);

    const scrollToBottom = useCallback((asyncCallback?: (callback: Function) => void, force = false) => {
        if (!chatSectionRef.current) return;

        const element = chatSectionRef.current;
        const scrollTopMax = element.scrollHeight - element.clientHeight;
        const shouldScroll = force || (scrollTopMax - element.scrollTop < 100);

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
                if (res.result?.data)
                    setMessages(_current => {
                        const oldMessages = [..._current];
                        const messagesToAdd = [...(res.result?.data || [])]
                            .filter(message => !oldMessages.some(m => m.id === message.id)); // prevent duplicate

                        const newMessages = [...messagesToAdd, ...oldMessages];

                        reachedToFirstMessage.current = _current.length === newMessages.length;

                        return newMessages;
                    });
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => {
                isLoadingMessages.current = false;
                setWaitingForPreviousMessagesToLoad(false);
            });
    }, [chatId, messages]);

    const submitPrompt = useCallback(() => {
        if (!chatId) return;
        setWaitingForCompletion(true);

        const _inputText = inputText;
        const _attachmentFile = uploadingFile;

        setInputText("");
        setUploadingFile(undefined);
        const inputDate = Date.now();
        chatService
            .submitPrompt({
                chatId,
                promptText: _inputText,
                attachmentFileId: _attachmentFile?.id,
            })
            .then(res => {
                if (res.result?.data) {
                    scrollToBottom(cb => setTimeout(() => cb(), 10));
                    setMessages(_current => [..._current, (
                        {
                            id: "new",
                            inputDate,
                            outputDate: Date.now(),
                            modelTitle: session.chatModels.find(model => model.id === selectedModel)?.caption ?? "",
                            input: inputText,
                            attachmentFilename: _attachmentFile?.name,
                            output: res.result?.data?.plainText ?? "ERR", points: res.result?.data?.pointUsage as number
                        }
                    )]);
                } else {
                    session.snackbarProvider(res.result?.message, { variant: "error" });
                    setInputText(_inputText);
                    setUploadingFile(_attachmentFile);
                }
            })
            .finally(() => setWaitingForCompletion(false));
    }, [chatId, inputText, uploadingFile]);

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
                if (res.result?.ok)
                    setSelectedModel(modelId);
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => {
                setModelChangeLock(false);
            });
    }, [modelChangeLock, chatId, session]);

    const handleMemoryAmountChange = useCallback((event: SelectChangeEvent<AIChatHistoryMemory>) => {
        if (memoryAmountChangeLock || !chatId) return;
        const memoryAmount = event.target.value as AIChatHistoryMemory;
        setMemoryAmountChangeLock(true);
        chatService
            .setMemoryAmount({ chatId, amount: memoryAmount })
            .then(res => {
                console.log(session)
                if (res.result?.ok && session.user) {
                    session.user.memoryAmount = memoryAmount;
                    session.user.saveMessages = memoryAmount !== AIChatHistoryMemory.None;
                }
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => {
                setMemoryAmountChangeLock(false);
            });
    }, [memoryAmountChangeLock, chatId, session]);

    const uploadFile = useCallback((file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        return new Promise((resolve) => {
            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                    setUploadingFile(_current => {
                        if (_current)
                            return (
                                {
                                    ..._current,
                                    uploadedAmount: Math.round((event.loaded / event.total) * 100),
                                }
                            );

                        return undefined;
                    });
                }
            });

            xhr.addEventListener("error", () => {
                setUploadingFile(undefined);
                session.snackbarProvider(session.uiText.errorOccurred, { variant: "error" });
            });

            xhr.addEventListener("loadend", () => {
                const res = xhr.getResponseHeader("content-type")?.includes("application/json") ? JSON.parse(xhr.response) : null;

                errorResponseMessageFormatter(res);

                if (!(xhr.readyState === 4 && xhr.status === 200)) {
                    setUploadingFile(undefined);
                    session.snackbarProvider(res.message || session.uiText.errorOccurred, { variant: "error", anchorOrigin: { horizontal: "center", vertical: "bottom", } });
                    return resolve(false);
                }

                if (res.ok && typeof res.data === "string")
                    setUploadingFile(_current => {
                        if (_current)
                            return (
                                {
                                    ..._current,
                                    id: res.data,
                                }
                            );

                        return undefined;
                    });

                if (!res.ok) {
                    setUploadingFile(undefined);
                    session.snackbarProvider(res.message, { variant: "error" });
                }
                resolve(res.ok);
            });

            xhr.open("PUT", "/api/v1/file/upload", true);
            xhr.send(formData);
        });
    }, []);

    const deleteUploadedFile = useCallback(() => {
        if (!uploadingFile?.id)
            return;

        setUploadingFile(undefined);

        fileService
            .deleteAttachment(uploadingFile?.id);

    }, [uploadingFile]);

    const fileSelectHandler = useCallback((file: File) => {
        if (uploadingFile)
            return;
        setUploadingFile({
            name: file.name,
            uploadedAmount: 0,
        });
        uploadFile(file);
    }, [uploadFile, uploadingFile]);

    useEffect(() => {
        if (initialized.current || !chatId) return;
        initialized.current = true;

        getMessages();

        chatService
            .getChatModelId(chatId)
            .then(res => {
                if (res.result?.ok && res.result.data) {
                    setSelectedModel(res.result.data);
                    setModelChangeLock(false);
                }
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            });
    }, [getMessages, chatId]);

    useEffect(() => {
        if (didFirstScrollToBottom.current || messages.length === 0) return;
        didFirstScrollToBottom.current = true;
        scrollToBottom(undefined, true);
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (session.themeManager.name === "light")
            import('prismjs/themes/prism.min.css');
        else
            import('prismjs/themes/prism-okaidia.min.css');
    }, [
        session.themeManager.name
    ]);

    return (
        <Stack direction="column" height="100%">
            <Box textAlign="center">
                <Stack direction="row" flexWrap="wrap" gap={1} paddingInline={1}>
                    <Box>
                        {chatId ? (
                            <ChatMoreActions
                                chatId={chatId}
                                onClearMessage={() => setMessages([])}
                            />
                        ) : null}
                    </Box>

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
                            <MenuItem key={model.id} value={model.id} sx={{ fontFamily: "monospace", direction: "ltr", fontSize: "0.8em", padding: 1, minHeight: "unset" }}>
                                <Stack direction="row" alignItems="center">
                                    <Icon fontSize="small">
                                        {model.caption.toLowerCase().startsWith("chatgpt") ? <CostlyModelIcon color="warning" fontSize="small" /> : <FreeModelIcon color="success" fontSize="small" />}
                                    </Icon>
                                    {model.caption}
                                </Stack>
                            </MenuItem>
                        ))}
                    </Select>

                    <FormControl
                        component="div"
                        size="small"
                    // sx={{
                    //     "> .MuiFormLabel-root": {
                    //         left: "unset",
                    //         right: "19px",
                    //     }
                    // }}
                    >
                        <InputLabel size="small">{session.uiText.memory}</InputLabel>
                        <Select
                            disabled={memoryAmountChangeLock}
                            size="small"
                            sx={{
                                borderRadius: 50,
                            }}
                            onChange={handleMemoryAmountChange}
                            value={session.user?.saveMessages ? session.user?.memoryAmount : AIChatHistoryMemory.None}
                            label={session.uiText.memory}
                        >
                            <MenuItem value={AIChatHistoryMemory.None}>{session.uiText.disabled}</MenuItem>
                            <MenuItem value={AIChatHistoryMemory.Short}>{session.uiText.short}</MenuItem>
                            <MenuItem value={AIChatHistoryMemory.Normal}>{session.uiText.normal}</MenuItem>
                            <MenuItem value={AIChatHistoryMemory.Long}>{session.uiText.high}</MenuItem>
                        </Select>
                    </FormControl>

                    <IconButton
                        sx={{
                            marginInlineStart: "auto"
                        }}
                        onClick={() => navigate("/ui/chats")}
                    >
                        <ArrowBack />
                    </IconButton>
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
                        <Box marginInline={1} marginBlock={2}>
                            <Card variant="elevation" sx={{ borderRadius: 10, display: "inline-block", overflow: "unset", maxWidth: "100%" }}>
                                <MessageBubble attachmentFilename={message.attachmentFilename} text={message.input} date={message.input.length < 15 ? undefined : new Date(message.inputDate)} />
                            </Card>
                        </Box>
                        <Box marginInline={1} marginBottom={8}>
                            <Box sx={{ backgroundColor: "transparent", borderRadius: 10, display: "inline-block", overflow: "unset", maxWidth: "100%", float: "inline-end" }}>
                                <MessageBubble pointUsage={message.points} text={message.output} date={new Date(message.outputDate)} modelTitle={message.modelTitle} />
                            </Box>
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
                    <Box
                        sx={{
                            ' input': {
                                display: "none",
                                visibility: "hidden",
                            }
                        }}
                    >
                        {uploadingFile ? (
                            <>
                                <Chip
                                    onDelete={uploadingFile.id ? deleteUploadedFile : undefined}
                                    icon={uploadingFile.id ? undefined : <CircularProgress variant="determinate" size="0.8em" value={uploadingFile.uploadedAmount} />}
                                    label={uploadingFile.name}
                                />
                            </>
                        ) : (
                            <label htmlFor="prompt-attachment">
                                <IconButton size="small" disabled={waitingForCompletion} onClick={() => document.getElementById('prompt-attachment')?.click()}>
                                    <UploadFile />
                                    {/* <AttachFile /> */}
                                </IconButton>
                                <input
                                    id="prompt-attachment"
                                    type="file"
                                    accept=".pdf,.txt,.js,.mjs,.ts,.jsx,.tsx,.css,.go,.json,.csproj,.cs,.cc,.java"
                                    onChange={e => e.target.files && fileSelectHandler(e.target.files[0])}
                                />
                            </label>
                        )}
                    </Box>
                    <TextField
                        fullWidth
                        size="small"
                        multiline
                        maxRows={5}
                        autoComplete="off"
                        variant="standard"
                        placeholder={session.uiText.writeYourText}
                        value={inputText}
                        onChange={e => e.target.value.length < 2048 && setInputText(e.target.value)}
                        slotProps={{
                            htmlInput: {
                                dir: inputText ? (stringHelper.isRtl(inputText) ? "rtl" : "ltr") : undefined
                            },
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