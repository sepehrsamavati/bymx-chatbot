import Button from "../button";
import "../../assets/css/chat.css";
import * as PrismJS from "prismjs";
import Box from "@mui/material/Box";
import Grow from "@mui/material/Grow";
import Chip from "@mui/material/Chip";
import Markdown from "react-markdown";
import Menu from "@mui/material/Menu";
import { useSession } from "~/core/Session";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import { stringHelper } from "bymx-core/shared";
import Typography from "@mui/material/Typography";
import AutoMode from "@mui/icons-material/AutoMode";
import ListItemIcon from "@mui/material/ListItemIcon";
import { copyToClipboard } from "~/core/helper/utils";
import OpenInFull from "@mui/icons-material/OpenInFull";
import AttachFile from "@mui/icons-material/AttachFile";
import ContentCopy from "@mui/icons-material/ContentCopy";
import loadLanguage from "~/core/helper/loadPrismLanguage";
import CloseFullscreen from "@mui/icons-material/CloseFullscreen";
import { Dialog, DialogActions, DialogContent } from "@mui/material";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const messageFadeInDuration = 1e3;

const typographyProcess = (element: HTMLElement | null) => {
    // Handle text direction
    element?.querySelectorAll('p, code')
        .forEach(childElement => {
            if (!('innerText' in childElement))
                return;

            const _element = childElement as HTMLDivElement;

            if (stringHelper.isRtl(_element.innerText.trimStart()))
                _element.dir = "rtl";
            else
                _element.dir = "ltr";
        });

    // Highlight all complete code blocks
    element?.querySelectorAll("code[class^=language-]")
        .forEach(codeElement => {
            const language = codeElement.className.split('-')[1];
            loadLanguage(language, () => {
                try {
                    PrismJS.highlightElement(codeElement);
                } catch (err) {
                    console.error("PRISM ERR", err);
                }
            });
        });
};

function Actions(props?: {
    anchorEl?: HTMLElement | null;
    open?: boolean;
    handleClose?: () => void;
    onCopy?: () => void;
    onFullscreenView?: () => void;
    onRegenerate?: () => void;
}) {
    const session = useSession();

    return (
        <Menu
            anchorEl={props?.anchorEl}
            open={(props?.anchorEl && props?.open) ?? false}
            onClose={props?.handleClose}
            onClick={props?.handleClose}
            onContextMenu={e => {
                if (props?.handleClose) {
                    e.preventDefault();
                    props.handleClose();
                }
            }}
            slotProps={{
                paper: {
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mt: 1.5,
                        '& .MuiAvatar-root': {
                            width: 32,
                            height: 32,
                            ml: -0.5,
                            mr: 1,
                        },
                        '&::before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            insetInlineStart: "50%",
                            width: 10,
                            height: 10,
                            bgcolor: 'background.paper',
                            transform: 'translateY(-50%) translateX(-50%) rotate(45deg)',
                            zIndex: 0,
                        },
                    },
                },
            }}
            transformOrigin={{ horizontal: 'center', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        >
            {props?.onCopy ? (
                <MenuItem onClick={props?.onCopy}>
                    <ListItemIcon>
                        <ContentCopy fontSize="small" />
                    </ListItemIcon>
                    {session.uiText.copy}
                </MenuItem>
            ) : null}
            {props?.onFullscreenView ? (
                <MenuItem onClick={props?.onFullscreenView}>
                    <ListItemIcon>
                        <OpenInFull fontSize="small" />
                    </ListItemIcon>
                    {session.uiText.fullscreenView}
                </MenuItem>
            ) : null}
            {props?.onRegenerate ? (
                <>
                    <Divider />
                    <MenuItem onClick={props?.onRegenerate}>
                        <ListItemIcon>
                            <AutoMode fontSize="small" />
                        </ListItemIcon>
                        {session.uiText.regenerate}
                    </MenuItem>
                </>
            ) : null}
        </Menu>
    );
}

export default function MessageBubble(props?: {
    text?: string;
    date?: Date;
    attachmentFilename?: string;
    pointUsage?: number;
    modelTitle?: string;
}) {
    const session = useSession();
    const divRef = useRef<HTMLDivElement>(null);
    const viewTextModalContentRef = useRef<HTMLDivElement>(null);
    const [displayText, setDisplayText] = useState<string>("");
    const [animatedParts, setAnimatedParts] = useState<string[]>([]);
    const [contextMenuAnchorEl, setContextMenuAnchorEl] = useState<HTMLElement>();
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [viewTextModalOpen, setViewTextModalOpen] = useState(false);
    const lastCompleteCodeBlockEnd = useRef<number>(0);
    const contextMenuTouchTimerRef = useRef(0);
    const contextMenuTouchTargetRef = useRef<EventTarget>(null);

    const date = useMemo(() => {
        if (!props?.date) return null;
        const now = new Date();
        if (now.toLocaleDateString() !== props.date.toLocaleDateString())
            return <i>{props.date.toLocaleString()}</i>;
        return <i>{props.date.toLocaleTimeString()}</i>;
    }, [props]);

    const openContextMenu = useCallback((e: Pick<Event, 'target' | 'preventDefault'>) => {
        const el = e.target instanceof HTMLElement ? e.target : null;
        if (!el) return;
        e.preventDefault();
        setContextMenuAnchorEl(el);
        setContextMenuOpen(true);
    }, []);

    const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = useCallback((e) => {
        e.preventDefault();
        contextMenuTouchTargetRef.current = e.target;
        contextMenuTouchTimerRef.current = window.setTimeout(openContextMenu, 500);
    }, [openContextMenu]);

    const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = useCallback(() => {
        if (contextMenuTouchTimerRef.current) {
            clearTimeout(contextMenuTouchTimerRef.current);
        }
    }, []);

    const copyToClipboardHandler = useCallback(() => {
        copyToClipboard(props?.text ?? "")
            .then(ok => {
                session.snackbarProvider(ok ? session.uiText.copied : session.uiText.errorOccurred, {
                    variant: ok ? "success" : "error",
                    autoHideDuration: 2e3,
                    anchorOrigin: {
                        horizontal: "center",
                        vertical: "bottom"
                    }
                });
            });
    }, [props, session]);

    useLayoutEffect(() => {
        typographyProcess(divRef.current);
    }, [displayText]);

    useLayoutEffect(() => {
        const text = props?.text || "";

        if (!session.localStorage.data.experimentalFeatures) {
            setDisplayText(text);
            return;
        }

        if (props?.text === undefined) return;

        // If text hasn't changed, just ensure rendering is correct
        if (props.text === displayText) {
            typographyProcess(divRef.current);
            return;
        }

        // Check if we're in the middle of a code block
        const lastBacktickPos = text.lastIndexOf('```');
        const isInCodeBlock = (text.match(/```/g) || []).length % 2 === 1;

        if (isInCodeBlock) {
            // We're inside a code block - update the entire text to maintain syntax
            setDisplayText(text);
            setAnimatedParts([]);

            // Track where the last complete code block ends
            if (lastBacktickPos > lastCompleteCodeBlockEnd.current) {
                lastCompleteCodeBlockEnd.current = lastBacktickPos;
            }
            return;
        }

        // Not in a code block - we can animate new parts
        const newParts: string[] = [];
        const oldLines = displayText.split('\n');
        const newLines = text.split('\n');

        // Only animate lines after the last complete code block
        const startLine = text.substring(0, lastCompleteCodeBlockEnd.current).split('\n').length;

        for (let i = startLine; i < newLines.length; i++) {
            if (i >= oldLines.length || newLines[i] !== oldLines[i]) {
                newParts.push(newLines[i] + (i < newLines.length - 1 ? '\n' : ''));
            }
        }

        if (newParts.length > 0) {
            setAnimatedParts(newParts);
            const timer = setTimeout(() => {
                setDisplayText(text);
                setAnimatedParts([]);
            }, messageFadeInDuration);
            return () => clearTimeout(timer);
        }

        // Default case - just update the text
        setDisplayText(text);
        lastCompleteCodeBlockEnd.current = 0; // Reset if we're out of all code blocks
    }, [session, props?.text, displayText]);

    return (
        <Box
            padding={1}
            component="div"
            className="message-bubble"
        >
            <Actions
                open={contextMenuOpen}
                anchorEl={contextMenuAnchorEl || divRef.current}
                handleClose={() => setContextMenuOpen(false)}
                onCopy={copyToClipboardHandler}
                onFullscreenView={() => setViewTextModalOpen(true)}
            />

            <Dialog
                fullScreen
                open={viewTextModalOpen}
                onClose={() => setViewTextModalOpen(false)}
                slotProps={{
                    transition: {
                        onTransitionStart: () => {
                            typographyProcess(viewTextModalContentRef.current);
                        }
                    }
                }}
            >
                <DialogContent
                    ref={viewTextModalContentRef}
                    className="message-bubble"
                >
                    <Markdown>{props?.text}</Markdown>
                </DialogContent>
                <DialogActions>
                    {props?.modelTitle ? <Chip label={props.modelTitle} /> : null}
                    <Button color="error" startIcon={<CloseFullscreen />} onClick={() => setViewTextModalOpen(false)}>{session.uiText.close}</Button>
                </DialogActions>
            </Dialog>

            <div
                ref={divRef}
                onContextMenu={openContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
            >
                <Markdown>{displayText}</Markdown>

                {animatedParts.map((part, index) => (
                    <Grow key={index} in timeout={{ enter: 500, appear: 500, exit: 0, }}>
                        <div>
                            <Markdown>{part}</Markdown>
                        </div>
                    </Grow>
                ))}

                {props?.attachmentFilename && (
                    <Chip
                        disabled
                        size="small"
                        icon={<AttachFile />}
                        label={props.attachmentFilename}
                    />
                )}
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
            >
                {props?.modelTitle} {date}{typeof props?.pointUsage === "number" ? ` ⚡${props.pointUsage}` : ''}
            </Typography>
        </Box>
    );
}