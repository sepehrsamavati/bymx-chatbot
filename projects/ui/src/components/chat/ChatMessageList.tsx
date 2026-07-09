import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import MessageBubble from "./MessageBubble";
import type { ChatMessage } from "./types";

type ChatMessageListProps = {
    messages?: ChatMessage[];
    waitingForPreviousMessagesToLoad: boolean;
    currentlyGeneratingInput?: string;
    streamingOutput: string;
    canRegenerate: boolean;
    chatSectionRef: React.RefObject<HTMLDivElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onScroll: React.UIEventHandler<HTMLDivElement>;
    onRegenerate: (message: ChatMessage) => void;
    emptyState: React.ReactNode;
};

export default function ChatMessageList({
    messages,
    waitingForPreviousMessagesToLoad,
    currentlyGeneratingInput,
    streamingOutput,
    canRegenerate,
    chatSectionRef,
    messagesEndRef,
    onScroll,
    onRegenerate,
    emptyState,
}: ChatMessageListProps) {
    return (
        <Stack
            flexGrow={1}
            minHeight={0}
            paddingBottom={1}
            overflow="auto"
            direction="column"
            ref={chatSectionRef}
            onScroll={onScroll}
        >
            {waitingForPreviousMessagesToLoad ? (
                <Box margin={4} textAlign="center">
                    <CircularProgress color="secondary" />
                </Box>
            ) : null}

            {messages?.map(message => (
                <Box key={message.id} fontSize="0.8em">
                    <Box marginInline={1} marginBlock={2} textAlign="end">
                        <Card variant="elevation" sx={{ borderRadius: 10, display: "inline-block", overflow: "unset", maxWidth: "100%", textAlign: "initial" }}>
                            <MessageBubble attachmentFilename={message.attachmentFilename} text={message.input} />
                        </Card>
                    </Box>
                    <Box marginInline={1} marginBottom={2}>
                        <Box sx={{ backgroundColor: "transparent", borderRadius: 10, display: "inline-block", overflow: "unset", maxWidth: "100%" }}>
                            <MessageBubble
                                pointUsage={message.points}
                                text={message.output}
                                date={new Date(message.outputDate)}
                                modelTitle={message.modelTitle}
                                onRegenerate={canRegenerate ? () => onRegenerate(message) : undefined}
                            />
                        </Box>
                    </Box>
                </Box>
            ))}

            {currentlyGeneratingInput ? (
                <Box fontSize="0.8em">
                    <Box marginInline={1} marginBlock={2} textAlign="end">
                        <Card variant="elevation" sx={{ borderRadius: 10, display: "inline-block", overflow: "unset", maxWidth: "100%", textAlign: "initial" }}>
                            <MessageBubble text={currentlyGeneratingInput} />
                        </Card>
                    </Box>
                    <Box marginInline={1} marginBottom={2}>
                        <Box sx={{ backgroundColor: "transparent", display: "inline-block", overflow: "unset", maxWidth: "100%" }}>
                            <MessageBubble isStreaming text={streamingOutput} />
                        </Box>
                    </Box>
                </Box>
            ) : null}

            {messages?.length === 0 && !currentlyGeneratingInput ? emptyState : null}

            <Box
                width="100%"
                className="chat-backdrop"
                sx={{
                    position: "relative",
                    display: { xs: "none", sm: "block" },
                    height: { xs: 0, sm: "200px", flexShrink: 0 },
                }}
            />
            <div ref={messagesEndRef} aria-hidden style={{ height: 0, flexShrink: 0 }} />
        </Stack>
    );
}
