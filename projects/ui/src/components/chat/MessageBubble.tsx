import Button from "../button";
import "~/assets/css/chat.css";
import * as PrismJS from "prismjs";
import Box from "@mui/material/Box";
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
import { useStreamingText } from "./useStreamingText";
import CloseFullscreen from "@mui/icons-material/CloseFullscreen";
import { defaultStreamEffect, type StreamEffect } from "./streamEffect";
import { Dialog, DialogActions, DialogContent, IconButton, Stack } from "@mui/material";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

const typographyProcess = (element: HTMLElement | null) => {
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
    const [showRegenerateConfirm, setShowRegenerateButtonConfirm] = useState(false);
    const regenerateButtonRef = useRef<HTMLElement | null>(null);

    const _menu = (
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
                <Divider />
            ) : null}
            {props?.onRegenerate ? (
                <MenuItem onClick={props?.onRegenerate}>
                    <ListItemIcon>
                        <AutoMode fontSize="small" />
                    </ListItemIcon>
                    {session.uiText.regenerate}
                </MenuItem>
            ) : null}
        </Menu>
    );

    return (
        <>
            {_menu}
            {props?.onRegenerate && props.onCopy ? (
                <Box marginTop={0.4}>
                    <Stack direction="row" flexWrap="wrap" fontSize="1.4em">
                        <IconButton onClick={props?.onCopy} sx={{ fontSize: "inherit" }}>
                            <ContentCopy fontSize="inherit" />
                        </IconButton>
                        <IconButton onClick={props?.onFullscreenView} sx={{ fontSize: "inherit" }}>
                            <OpenInFull fontSize="inherit" />
                        </IconButton>
                        <IconButton ref={regenerateButtonRef} component="span" onClick={() => setShowRegenerateButtonConfirm(true)} sx={{ fontSize: "inherit" }}>
                            <AutoMode fontSize="inherit" />
                        </IconButton>

                        <Menu
                            anchorEl={regenerateButtonRef.current}
                            open={showRegenerateConfirm}
                            onClose={() => setShowRegenerateButtonConfirm(false)}
                            slotProps={{
                                paper: {
                                    elevation: 0,
                                    sx: {
                                        overflow: 'visible',
                                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                        mt: 0.5,
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
                            <MenuItem onClick={props?.onRegenerate}>
                                <ListItemIcon>
                                    <AutoMode fontSize="small" />
                                </ListItemIcon>
                                {session.uiText.regenerate}
                            </MenuItem>
                        </Menu>
                    </Stack>
                </Box>
            ) : null}
        </>
    );
}

export default function MessageBubble(props?: {
    text?: string;
    date?: Date;
    attachmentFilename?: string;
    pointUsage?: number;
    modelTitle?: string;
    onRegenerate?: () => void;
    isStreaming?: boolean;
    streamEffect?: StreamEffect;
}) {
    const session = useSession();
    const divRef = useRef<HTMLDivElement>(null);
    const viewTextModalContentRef = useRef<HTMLDivElement>(null);
    const [contextMenuAnchorEl, setContextMenuAnchorEl] = useState<HTMLElement>();
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [viewTextModalOpen, setViewTextModalOpen] = useState(false);
    const contextMenuTouchTimerRef = useRef(0);
    const contextMenuTouchTargetRef = useRef<EventTarget>(null);

    const text = props?.text ?? "";
    const resolvedEffect = props?.streamEffect
        ?? (session.localStorage.data.experimentalFeatures ? session.localStorage.data.streamEffect : defaultStreamEffect);

    const { displayText, contentRef, isTyping, activeEffect } = useStreamingText(text, {
        isStreaming: props?.isStreaming,
        effect: resolvedEffect,
    });

    const date = useMemo(() => {
        if (!props?.date) return null;
        const now = new Date();
        if (now.toLocaleDateString() !== props.date.toLocaleDateString())
            return <i>{props.date.toLocaleString()}</i>;
        return <i>{props.date.toLocaleTimeString()}</i>;
    }, [props?.date]);

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
        if (contextMenuTouchTimerRef.current)
            clearTimeout(contextMenuTouchTimerRef.current);
    }, []);

    const copyToClipboardHandler = useCallback(() => {
        copyToClipboard(divRef.current?.innerText || text)
            .then(ok => {
                if (!ok)
                    session.snackbarProvider(session.uiText.errorOccurred, {
                        variant: "error",
                        autoHideDuration: 2e3,
                        anchorOrigin: {
                            horizontal: "center",
                            vertical: "bottom"
                        }
                    });
            });
    }, [text, session]);

    useLayoutEffect(() => {
        typographyProcess(divRef.current);
    }, [displayText]);

    return (
        <Box
            padding={1}
            component="div"
            className="message-bubble"
        >
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
                    <Markdown>{text}</Markdown>
                </DialogContent>
                <DialogActions>
                    {props?.modelTitle ? <Chip label={props.modelTitle} /> : null}
                    {typeof props?.pointUsage === "number" ? <Chip variant="outlined" label={`⚡ ${props.pointUsage}`} /> : ''}
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
                <div
                    ref={contentRef}
                    className="message-bubble-content"
                    data-stream-effect={props?.isStreaming ? activeEffect : undefined}
                >
                    <Markdown>{displayText}</Markdown>
                    {isTyping ? <span className="stream-type-cursor" aria-hidden>▊</span> : null}
                </div>

                {props?.attachmentFilename && (
                    <Chip
                        disabled
                        size="small"
                        icon={<AttachFile />}
                        label={props.attachmentFilename}
                    />
                )}
            </div>

            <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="space-between" alignItems="center">
                <Actions
                    open={contextMenuOpen}
                    anchorEl={contextMenuAnchorEl || divRef.current}
                    handleClose={() => setContextMenuOpen(false)}
                    onCopy={copyToClipboardHandler}
                    onFullscreenView={() => setViewTextModalOpen(true)}
                    onRegenerate={props?.onRegenerate}
                />
                <Typography
                    component="span"
                    sx={{
                        fontSize: "0.6em",
                        fontFamily: "monospace",
                        color: "GrayText",
                        direction: session.fixDirection("ltr"),
                    }}
                >
                    {date}{typeof props?.pointUsage === "number" ? ` ⚡${props.pointUsage}` : ''}
                </Typography>
            </Stack>
        </Box>
    );
}
