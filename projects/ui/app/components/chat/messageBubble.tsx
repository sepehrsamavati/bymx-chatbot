import * as PrismJS from "prismjs";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Markdown from "react-markdown";
import colors from "~/core/config/colors";
import { stringHelper } from "bymx-core/shared";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useRef, useState } from "react";
import { colors as muiColors } from "@mui/material";
import AttachFile from "@mui/icons-material/AttachFile";
import Grow from "@mui/material/Grow";
import loadLanguage from "~/core/helper/loadPrismLanguage";

export default function MessageBubble(props?: {
    text?: string;
    date?: Date;
    attachmentFilename?: string;
    pointUsage?: number;
    modelTitle?: string;
}) {
    const divRef = useRef<HTMLDivElement>(null);
    const [previousText, setPreviousText] = useState<string>("");
    const [newTextParts, setNewTextParts] = useState<string[]>([]);

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
                const language = codeElement.className.split('-')[1];
                loadLanguage(language, () => {
                    PrismJS.highlightElement(codeElement);
                });
            });
    }, [props]);

    // Effect to detect new text parts and animate them
    useEffect(() => {
        if (props?.text === undefined) return;

        // First render - no previous text
        if (previousText === "") {
            setPreviousText(props.text || "");
            return;
        }

        // Text hasn't changed
        if (props.text === previousText) return;

        // Find the new parts by comparing with previous text
        const newParts = [];
        const oldParts = previousText.split(/(?=\n)/);
        const currentParts = props.text.split(/(?=\n)/);

        for (let i = 0; i < currentParts.length; i++) {
            if (i >= oldParts.length || currentParts[i] !== oldParts[i]) {
                newParts.push(currentParts[i]);
            }
        }

        if (newParts.length > 0) {
            setNewTextParts(newParts);
            // Reset new parts after animation would complete
            const timer = setTimeout(() => {
                setNewTextParts([]);
            }, 1000);
            return () => clearTimeout(timer);
        }

        setPreviousText(props.text || "");
    }, [props?.text, previousText]);

    return (
        <Box
            padding={1}
            component="div"
            fontSize="inherit"
            whiteSpace="pre-line"
            sx={{
                position: "relative",
                'h1, h2, h3, h4, h5, h6': {
                    margin: 0,
                },
                ' p': {
                    margin: 0
                },
                ' pre': {
                    overflow: "auto",
                    direction: "rtl",
                    borderRadius: 2,
                },
                ' ol': {
                    margin: 0,
                    whiteSpace: "initial"
                },
                ' ul': {
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
                {/* Render the base text without the new parts */}
                <Markdown>{previousText}</Markdown>
                
                {/* Animate the new parts */}
                {newTextParts.map((part, index) => (
                    <Grow key={index} in timeout={1e3}>
                        <div>
                            <Markdown>{part}</Markdown>
                        </div>
                    </Grow>
                ))}

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