import "../assets/css/chat.css";
import colors from "~/core/config/colors";
import { useSession } from "~/core/Session";
import Send from "@mui/icons-material/Send";
import { stringHelper, UIText } from "bymx-core/shared";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { useNavigate, useParams } from "react-router";
import chatService from "~/core/services/chatService";
import fileService from "~/core/services/fileService";
import { socketManager } from "~/core/services/socket";
import UploadFile from "@mui/icons-material/UploadFile";
import FreeModelIcon from "@mui/icons-material/MoneyOff";
import type { Api, PromptViewModel } from "bymx-core/types";
import MessageBubble from "~/components/chat/messageBubble";
import MenuBook from "@mui/icons-material/MenuBook";
import DataObject from "@mui/icons-material/DataObject";
import Restaurant from "@mui/icons-material/Restaurant";
import FitnessCenter from "@mui/icons-material/FitnessCenter";
import CostlyModelIcon from "@mui/icons-material/AttachMoney";
import ChatMoreActions from "~/components/chat/chatMoreActions";
import { errorResponseMessageFormatter } from "~/core/helper/HttpClient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Card, Chip, CircularProgress, Divider, Icon, IconButton, MenuItem, Popover, Select, Stack, TextField, type SelectChangeEvent } from "@mui/material";

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

enum ReadyPromptCategory {
    Coding = 1, Workout = 2, Cooking = 3, SummarizeText = 4,
}

const readyPromptCategoryToPromptsListMap: { [key in ReadyPromptCategory]: UIText.UITextKey[] } = ({
    [ReadyPromptCategory.Coding]: ["_prompt_coding", "_prompt_codingPythonHttpServer"],
    [ReadyPromptCategory.Workout]: ["_prompt_workout", "_prompt_workoutAtHome"],
    [ReadyPromptCategory.Cooking]: ["_prompt_cooking", "_prompt_cookingPizza"],
    [ReadyPromptCategory.SummarizeText]: ["_prompt_summarizeText"],
});

export default function Chat() {
    const session = useSession();
    const navigate = useNavigate();
    const { chatId } = useParams();
    const [selectedCategory, setSelectedCategory] = useState<ReadyPromptCategory>();
    const [messages, setMessages] = useState<ChatMessage[]>();
    const streamingMessageChunks = useRef<(string | undefined)[]>([]);
    const [currentlyGeneratingMessage, setCurrentlyGeneratingMessage] = useState<{ input: string; output: string; }>();
    const initialized = useRef(false);
    const didFirstScrollToBottom = useRef(false);
    const [inputText, setInputText] = useState("");
    const reachedToFirstMessage = useRef(false);
    const isLoadingMessages = useRef(false);
    const chatSectionRef = useRef<HTMLDivElement>(null);
    const [uploadingFile, setUploadingFile] = useState<SelectedAttachmentFile>();
    const [modelChangeLock, setModelChangeLock] = useState(true);
    const [selectedModel, setSelectedModel] = useState("");
    const [waitingForPreviousMessagesToLoad, setWaitingForPreviousMessagesToLoad] = useState(false);
    const [waitingForCompletion, setWaitingForCompletion] = useState(false);
    const socket = useMemo(() => socketManager(), []);
    const cantSubmit = inputText.trim().length === 0 || waitingForCompletion;
    const formRef = useRef<HTMLFormElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

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
        const lastMessageId = messages?.at(0)?.id;
        chatService
            .getMessages({
                chatId,
                lastMessageId,
            })
            .then(res => {
                if (res.result?.data)
                    setMessages(_current => {
                        _current ||= [];
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
            streamingMessageChunks.current = [];
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
                            streamingMessageChunks.current = [];
                            setCurrentlyGeneratingMessage(undefined);
                            return { closeListener: true };
                        } else {
                            if (!result) {
                                rollback();
                            } else if (result?.outputChunk) {
                                scrollToBottom(cb => setTimeout(() => cb(), 10));
                                streamingMessageChunks.current[result.outputChunk.index] = result.outputChunk.value;
                                setCurrentlyGeneratingMessage(_current => ({ input: _inputText, output: streamingMessageChunks.current.filter(v => typeof v === "string").join('') }));
                            }
                        }

                        return;
                    },
                );
        }

        chatService
            .submitPrompt(dto)
            .then(response => {
                if(response.result?.data?.memoryUpdated)
                    session.snackbarProvider(session.uiText.memoryUpdate, { variant: "success" });

                const result = response.result;
                if (result?.data) {
                    scrollToBottom(cb => setTimeout(() => cb(), 10));
                    setMessages(_current => [...(_current || []), (
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
    }, [chatId, inputText, uploadingFile, socket, selectedModel]);

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
        if (didFirstScrollToBottom.current || messages?.length === 0) return;
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
                                onClearMessage={() => {
                                    reachedToFirstMessage.current = true;
                                    setMessages([]);
                                }}
                            />
                        ) : null}
                    </Box>

                    {session.chatModels.length && selectedModel ? (
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
                    ) : null}

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
                {messages?.map(message => (
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

                {messages?.length === 0 && !currentlyGeneratingMessage ? (
                    <Box width="100%" flexGrow={1} display="flex" alignItems="center" justifyContent="center">
                        <Stack direction="row" flexWrap="wrap" gap={1} maxWidth="250px" justifyContent="center">
                            <Chip variant="outlined" color="info" label={session.uiText.coding} icon={<DataObject />} onClick={() => setSelectedCategory(ReadyPromptCategory.Coding)} />
                            <Chip variant="outlined" color="success" label={session.uiText.workout} icon={<FitnessCenter />} onClick={() => setSelectedCategory(ReadyPromptCategory.Workout)} />
                            <Chip variant="outlined" color="error" label={session.uiText.cooking} icon={<Restaurant />} onClick={() => setSelectedCategory(ReadyPromptCategory.Cooking)} />
                            <Chip variant="outlined" color="warning" label={session.uiText.summarizeText} icon={<MenuBook />} onClick={() => setSelectedCategory(ReadyPromptCategory.SummarizeText)} />
                        </Stack>
                    </Box>
                ) : null}

                <Box
                    width="100%"
                    className="chat-backdrop"
                    sx={{
                        position: "relative",
                        display: { xs: "none", sm: "block" },
                        height: { xs: 0, sm: "200px", flexShrink: 0, }
                    }}
                />
            </Stack>

            <Card
                sx={{
                    padding: 1,
                    bottom: 0,
                    marginInline: "auto !important",
                    width: {
                        xs: "100%",
                        sm: "90%",
                        lg: "100%",
                    },
                    overflow: "initial",
                    margin: {
                        xs: 0,
                        sm: 4,
                    },
                    borderRadius: {
                        xs: 0,
                        sm: 3,
                    },
                    maxWidth: {
                        xs: 'initial',
                        sm: '800px',
                    },

                    position: {
                        sm: "absolute",
                    },
                    transform: {
                        sm: "translateX(-50%)"
                    },
                    insetInlineStart: {
                        sm: "50%"
                    },
                }}
            >
                <form
                    ref={formRef}
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

                    <Divider />

                    <Popover
                        open={Boolean(selectedCategory)}
                        // hideBackdrop
                        anchorEl={textInputRef.current}
                        onClose={() => setSelectedCategory(undefined)}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        slotProps={{
                            paper: {
                                sx: {
                                    borderRadius: "1.3rem"
                                }
                            },
                            backdrop: {
                                sx: {
                                    backdropFilter: "blur(2px) saturate(0.7) brightness(0.4)"
                                }
                            },
                        }}
                    >
                        <Box width={textInputRef.current?.offsetWidth} maxWidth="100%">
                            <Stack direction="column" gap={1} padding={0.8} width="100%">
                                {selectedCategory ? (
                                    readyPromptCategoryToPromptsListMap[selectedCategory].map(key => (
                                        <Box
                                            key={key}
                                            onClick={() => {
                                                setInputText(session.uiText[key]);
                                                setSelectedCategory(undefined);
                                                textInputRef.current?.focus()
                                            }}
                                            sx={{ cursor: "pointer", fontSize: "0.7em", borderRadius: "10rem", border: '1px dashed currentColor', padding: 0.5, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "100%" }}
                                        >{session.uiText[key]}</Box>
                                    ))
                                ) : null}
                            </Stack>
                        </Box>
                    </Popover>

                    <TextField
                        ref={textInputRef}
                        fullWidth
                        size="small"
                        multiline
                        maxRows={5}
                        autoComplete="off"
                        variant="standard"
                        placeholder={session.uiText.writeYourText}
                        value={inputText}
                        onChange={e => e.target.value.length < 2048 && setInputText(e.target.value)}
                        onKeyDown={e => {
                            if (!session.isMobile && e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();

                                if (cantSubmit)
                                    return;

                                formRef.current?.dispatchEvent(
                                    new Event("submit", {
                                        'bubbles': true,
                                        'cancelable': true,
                                    })
                                );
                            }
                        }}
                        slotProps={{
                            htmlInput: {
                                dir: inputText ? (stringHelper.isRtl(inputText) ? "rtl" : "ltr") : undefined
                            },
                            input: {
                                disableUnderline: true,
                                endAdornment: (
                                    <IconButton type="submit" size="small" disabled={cantSubmit}>
                                        {waitingForCompletion ? <CircularProgress size="1em" color="inherit" /> : <Send sx={{ rotate: document.documentElement.dir === "rtl" ? "180deg" : "0deg" }} />}
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