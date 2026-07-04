import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Send from "@mui/icons-material/Send";
import UploadFile from "@mui/icons-material/UploadFile";
import { stringHelper } from "bymx-core/shared";
import type Session from "~/core/Session";
import { useRef } from "react";
import {
    ReadyPromptCategory,
    acceptedFileExtensions,
    readyPromptCategoryToPromptsListMap,
    type SelectedAttachmentFile,
} from "./types";

type ChatInputFormProps = {
    session: Session;
    inputText: string;
    cantSubmit: boolean;
    waitingForCompletion: boolean;
    uploadingFile?: SelectedAttachmentFile;
    selectedCategory?: ReadyPromptCategory;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
    onSelectFile: (file: File) => void;
    onDeleteFile: () => void;
    onSelectCategory: (category: ReadyPromptCategory | undefined) => void;
};

export default function ChatInputForm({
    session,
    inputText,
    cantSubmit,
    waitingForCompletion,
    uploadingFile,
    selectedCategory,
    onInputChange,
    onSubmit,
    onSelectFile,
    onDeleteFile,
    onSelectCategory,
}: ChatInputFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    return (
        <Card
            sx={{
                padding: 1,
                bottom: 0,
                marginInline: "auto !important",
                width: { xs: "100%", sm: "90%", lg: "100%" },
                overflow: "initial",
                margin: { xs: 0, sm: 4 },
                borderRadius: { xs: 0, sm: 3 },
                maxWidth: { xs: "initial", sm: "800px" },
                position: { sm: "absolute" },
                transform: { sm: "translateX(-50%)" },
                insetInlineStart: { sm: "50%" },
            }}
        >
            <form
                ref={formRef}
                onSubmit={e => {
                    e.preventDefault();
                    onSubmit();
                }}
            >
                <Box
                    sx={{
                        paddingBottom: 0.7,
                        " button": { padding: 0 },
                        " input": { display: "none", visibility: "hidden" },
                    }}
                >
                    {uploadingFile ? (
                        <Chip
                            onDelete={uploadingFile.id ? onDeleteFile : undefined}
                            icon={uploadingFile.id ? undefined : (
                                <CircularProgress variant="determinate" size="0.8em" value={uploadingFile.uploadedAmount} />
                            )}
                            label={uploadingFile.name}
                        />
                    ) : (
                        <label htmlFor="prompt-attachment">
                            <IconButton size="small" disabled={waitingForCompletion} onClick={() => document.getElementById("prompt-attachment")?.click()}>
                                <UploadFile />
                            </IconButton>
                            <input
                                id="prompt-attachment"
                                type="file"
                                accept={acceptedFileExtensions}
                                onChange={e => e.target.files && onSelectFile(e.target.files[0])}
                            />
                        </label>
                    )}
                </Box>

                <Divider />

                <Popover
                    open={Boolean(selectedCategory)}
                    anchorEl={textInputRef.current}
                    onClose={() => onSelectCategory(undefined)}
                    anchorOrigin={{ vertical: "top", horizontal: "left" }}
                    slotProps={{
                        paper: { sx: { borderRadius: "1.3rem" } },
                        backdrop: { sx: { backdropFilter: "blur(2px) saturate(0.7) brightness(0.4)" } },
                    }}
                >
                    <Box width={textInputRef.current?.offsetWidth} maxWidth="100%">
                        <Stack direction="column" gap={1} padding={0.8} width="100%">
                            {selectedCategory ? readyPromptCategoryToPromptsListMap[selectedCategory].map(key => (
                                <Box
                                    key={key}
                                    onClick={() => {
                                        onInputChange(session.uiText[key]);
                                        onSelectCategory(undefined);
                                        textInputRef.current?.focus();
                                    }}
                                    sx={{
                                        cursor: "pointer",
                                        fontSize: "0.7em",
                                        borderRadius: "10rem",
                                        border: "1px dashed currentColor",
                                        padding: 0.5,
                                        textOverflow: "ellipsis",
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                        width: "100%",
                                    }}
                                >
                                    {session.uiText[key]}
                                </Box>
                            )) : null}
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
                    onChange={e => e.target.value.length < 2048 && onInputChange(e.target.value)}
                    onKeyDown={e => {
                        if (!session.isMobile && e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (cantSubmit) return;

                            formRef.current?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
                        }
                    }}
                    slotProps={{
                        htmlInput: {
                            dir: inputText ? (stringHelper.isRtl(inputText) ? "rtl" : "ltr") : undefined,
                        },
                        input: {
                            disableUnderline: true,
                            endAdornment: (
                                <IconButton type="submit" size="small" disabled={cantSubmit}>
                                    {waitingForCompletion ? (
                                        <CircularProgress size="1.3em" color="inherit" />
                                    ) : (
                                        <Send sx={{ fontSize: "1.3em", rotate: document.documentElement.dir === "rtl" ? "180deg" : "0deg" }} />
                                    )}
                                </IconButton>
                            ),
                        },
                    }}
                />
            </form>
        </Card>
    );
}
