import { useSession } from "~/core/Session";
import Send from "@mui/icons-material/Send";
import { io, type Socket } from 'socket.io-client';
import ArrowBack from "@mui/icons-material/ArrowBack";
import { useNavigate, useParams } from "react-router";
import chatService from "~/core/services/chatService";
import fileService from "~/core/services/fileService";
import UploadFile from "@mui/icons-material/UploadFile";
import FreeModelIcon from "@mui/icons-material/MoneyOff";
import MessageBubble from "~/components/chat/messageBubble";
import CostlyModelIcon from "@mui/icons-material/AttachMoney";
import ChatMoreActions from "~/components/chat/chatMoreActions";
import { AIChatHistoryMemory, stringHelper } from "bymx-core/shared";
import { errorResponseMessageFormatter } from "~/core/helper/HttpClient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Api, IOperationResultWithData, PromptViewModel } from "bymx-core/types";
import { Box, Card, Chip, CircularProgress, FormControl, Icon, IconButton, InputLabel, MenuItem, Select, Stack, TextField, type SelectChangeEvent } from "@mui/material";

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

const socketManager = () => {
    const socket = io({
        path: "/api/v1/ws",
        autoConnect: false,
    });
    let socketConnectionId = "";

    socket.on("hello", (res: Api.SocketIo.HelloResponse) => socketConnectionId = res.connectionId);
    socket.connect();

    const registerPromptResultHandler = (requestId: string, reader: (result: Api.SocketIo.SubmitPromptResult) => void | { closeListener?: true }) => {
        const handler = (res: Api.SocketIo.SubmitPromptResult) => {
            if (requestId && requestId === res.clientRequestId) {
                const shouldCloseListener = reader(res);
                if (shouldCloseListener)
                    socket.off("submitPromptResult", handler);
            }
        };
        socket.on("submitPromptResult", handler);
    };

    return {
        getConnectionId: () => socketConnectionId,
        registerPromptResultHandler
    };
};

export default function Chat() {
    const session = useSession();
    const navigate = useNavigate();
    const { chatId } = useParams();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentlyGeneratingMessage, setCurrentlyGeneratingMessage] = useState<{ input: string; output: string; }>();
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
    const socket = useMemo(() => socketManager(), []);

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

    const submitPrompt = useCallback((stream = false) => {
        if (!chatId) return;
        setWaitingForCompletion(true);

        const _inputText = inputText;
        const _attachmentFile = uploadingFile;
        const inputDate = Date.now();
        const socketConnectionId = socket.getConnectionId();
        const requestId = window.crypto.randomUUID();

        setInputText("");
        setUploadingFile(undefined);
        let responseReturned = false;
        const dto = {
            chatId,
            promptText: _inputText,
            attachmentFileId: _attachmentFile?.id,
            ...(
                socketConnectionId ? {
                    streamSocketId: socketConnectionId,
                    clientRequestId: requestId,
                } : undefined
            ),
        } satisfies Api.ChatDto.ILlmPromptRequest;

        scrollToBottom(cb => setTimeout(() => cb(), 10), true);
        setCurrentlyGeneratingMessage({ input: _inputText, output: "", });
        const rollback = () => {
            setInputText(_inputText);
            setUploadingFile(_attachmentFile);
        };
        const _finally = () => {
            responseReturned = true;
            setCurrentlyGeneratingMessage(undefined);
            setWaitingForCompletion(false);
        };


        if (stream) {
            /** @todo Should remove if request failed - increases memory usage */
            socket
                .registerPromptResultHandler(
                    requestId,
                    result => {

                        if (responseReturned)
                            return { closeListener: true };

                        if (result.finished && result.isComplete) {
                            setWaitingForCompletion(false);
                            scrollToBottom(cb => setTimeout(() => cb(), 10));
                            setMessages(_current => [..._current, (
                                {
                                    id: requestId,
                                    inputDate,
                                    outputDate: Date.now(),
                                    modelTitle: session.chatModels.find(model => model.id === selectedModel)?.caption ?? "",
                                    input: _inputText,
                                    attachmentFilename: _attachmentFile?.name,
                                    output: result?.plainText ?? "ERR",
                                    points: result?.pointUsage as number,
                                }
                            )]);
                            setCurrentlyGeneratingMessage(undefined);
                            return { closeListener: true };
                        } else {
                            if (!result) {
                                rollback();
                            } else if (result?.outputChunk) {
                                scrollToBottom(cb => setTimeout(() => cb(), 10));
                                setCurrentlyGeneratingMessage(_current => ({ input: _inputText, output: (_current?.output || "") + result!.outputChunk!.value }));
                            }
                        }

                        return;
                    },
                );
        }

        chatService
            .submitPrompt(dto)
            .then(response => {
                const result = response.result;
                if (result?.data) {
                    scrollToBottom(cb => setTimeout(() => cb(), 10));
                    setMessages(_current => [..._current, (
                        {
                            id: requestId,
                            inputDate,
                            outputDate: Date.now(),
                            modelTitle: session.chatModels.find(model => model.id === selectedModel)?.caption ?? "",
                            input: _inputText,
                            attachmentFilename: _attachmentFile?.name,
                            output: result?.data?.plainText ?? "ERR", points: result?.data?.pointUsage as number
                        }
                    )]);
                } else {
                    session.snackbarProvider(result?.message, { variant: "error" });
                    rollback();
                }
            })
            .finally(_finally);
    }, [chatId, inputText, uploadingFile, socket]);

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
    }, [session.themeManager.name]);

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
                {currentlyGeneratingMessage ? (
                    <Box fontSize="0.8em">
                        <Box marginInline={1} marginBlock={2}>
                            <Card variant="elevation" sx={{ borderRadius: 10, display: "inline-block", overflow: "unset", maxWidth: "100%" }}>
                                <MessageBubble text={currentlyGeneratingMessage.input} />
                            </Card>
                        </Box>
                        <Box marginInline={1} marginBottom={8}>
                            <Box sx={{ backgroundColor: "transparent", borderRadius: 10, display: "inline-block", overflow: "unset", maxWidth: "100%", float: "inline-end" }}>
                                <MessageBubble text={currentlyGeneratingMessage.output} />
                            </Box>
                        </Box>
                    </Box>
                ) : null}
            </Stack>

            <Card sx={{ padding: 1, borderRadius: 0, overflow: "initial" }}>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        submitPrompt(true);
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