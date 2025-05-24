import * as PrismJS from "prismjs";
import Box from "@mui/material/Box";
import Grow from "@mui/material/Grow";
import Chip from "@mui/material/Chip";
import Markdown from "react-markdown";
import colors from "~/core/config/colors";
import { useSession } from "~/core/Session";
import { stringHelper } from "bymx-core/shared";
import Typography from "@mui/material/Typography";
import { colors as muiColors } from "@mui/material";
import AttachFile from "@mui/icons-material/AttachFile";
import loadLanguage from "~/core/helper/loadPrismLanguage";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

const messageFadeInDuration = 1e3;

export default function MessageBubble(props?: {
    text?: string;
    date?: Date;
    attachmentFilename?: string;
    pointUsage?: number;
    modelTitle?: string;
}) {
    const session = useSession();
    const divRef = useRef<HTMLDivElement>(null);
    const [displayText, setDisplayText] = useState<string>("");
    const [animatedParts, setAnimatedParts] = useState<string[]>([]);
    const lastCompleteCodeBlockEnd = useRef<number>(0);

    const date = useMemo(() => {
        if (!props?.date) return null;
        const now = new Date();
        if (now.toLocaleDateString() !== props.date.toLocaleDateString())
            return <i>{props.date.toLocaleString()}</i>;
        return <i>{props.date.toLocaleTimeString()}</i>;
    }, [props]);

    const postRenderTasks = useCallback(() => {
        if (!divRef.current) return;

        // Handle text direction
        divRef.current.querySelectorAll('p').forEach(paragraphElement => {
            if (stringHelper.isRtl(paragraphElement.innerText.trimStart()))
                paragraphElement.dir = "rtl";
            else
                paragraphElement.dir = "ltr";
        });

        // Highlight all complete code blocks
        divRef.current.querySelectorAll("code[class^=language-]").forEach(codeElement => {
            const language = codeElement.className.split('-')[1];
            loadLanguage(language, () => {
                try {
                    PrismJS.highlightElement(codeElement);
                } catch (err) {
                    console.error("PRISM ERR", err)
                }
            });
        });
    }, []);

    useLayoutEffect(() => {
        postRenderTasks();
    }, [displayText, postRenderTasks]);

    useLayoutEffect(() => {
        const text = props?.text || "";

        if (!session.localStorage.data.experimentalFeatures) {
            setDisplayText(text);
            return;
        }

        if (props?.text === undefined) return;

        // If text hasn't changed, just ensure rendering is correct
        if (props.text === displayText) {
            postRenderTasks();
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
    }, [session, props?.text, displayText, postRenderTasks]);

    return (
        <Box
            padding={1}
            component="div"
            fontSize="inherit"
            whiteSpace="pre-line"
            sx={{
                position: "relative",
                'h1, h2, h3, h4, h5, h6': { margin: 0 },
                ' p': { margin: 0 },
                ' pre': {
                    overflow: "auto",
                    direction: "rtl",
                    borderRadius: 2,
                },
                ' ol, ul': {
                    margin: 0,
                    whiteSpace: "initial"
                },
                ' li': {
                    margin: 1,
                    marginTop: 2,
                },
                ' li > code, p > code': {
                    color: colors.antiFlashWhite,
                    backgroundColor: muiColors.grey[900],
                    padding: 0.4,
                    borderRadius: "10em",
                    display: "inline-block",
                    marginBottom: "1px",
                }
            }}
        >
            <div ref={divRef}>
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