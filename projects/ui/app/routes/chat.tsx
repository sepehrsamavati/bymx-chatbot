import "../assets/css/chat.css";
import { useParams } from "react-router";
import { useState } from "react";
import { LayoutInner } from "~/layout/layoutInner";
import { useChat } from "~/components/chat/hooks/useChat";
import ChatTopBar from "~/components/chat/chatTopBar";
import ChatMessageList from "~/components/chat/chatMessageList";
import ChatEmptyState from "~/components/chat/chatEmptyState";
import ChatInputForm from "~/components/chat/chatInputForm";
import { ReadyPromptCategory } from "~/components/chat/types";

function ChatPage() {
    const [selectedCategory, setSelectedCategory] = useState<ReadyPromptCategory>();
    const chat = useChat(useParams().chatIdParam);

    const showModelSelect = Boolean(
        chat.session.chatModels.length
        && (chat.isNewChat ? true : chat.selectedModel),
    );

    return (
        <LayoutInner
            fullWidth
            fullHeight
            topBar={(
                <ChatTopBar
                    modelsReadyKey={chat.modelsReadyKey}
                    models={chat.session.chatModels}
                    showModelSelect={showModelSelect}
                    selectedModel={chat.selectedModel}
                    modelChangeLock={chat.modelChangeLock}
                    chatId={chat.chatId}
                    onModelChange={chat.handleModelChange}
                    onClearMessages={chat.clearMessages}
                />
            )}
        >
            <ChatMessageList
                messages={chat.messages}
                waitingForPreviousMessagesToLoad={chat.waitingForPreviousMessagesToLoad}
                currentlyGeneratingInput={chat.currentlyGeneratingMessage?.input}
                streamingOutput={chat.streamingOutput}
                canRegenerate={!chat.isLoadingMessages.current && !chat.waitingForCompletion}
                chatSectionRef={chat.chatSectionRef}
                messagesEndRef={chat.messagesEndRef}
                onScroll={chat.scrollHandler}
                onRegenerate={chat.regenerate}
                emptyState={(
                    <ChatEmptyState
                        session={chat.session}
                        onSelectCategory={setSelectedCategory}
                    />
                )}
            />

            <ChatInputForm
                session={chat.session}
                inputText={chat.inputText}
                cantSubmit={chat.cantSubmit}
                waitingForCompletion={chat.waitingForCompletion}
                uploadingFile={chat.uploadingFile}
                selectedCategory={selectedCategory}
                onInputChange={chat.setInputText}
                onSubmit={() => chat.submitPrompt()}
                onSelectFile={chat.selectFile}
                onDeleteFile={chat.deleteUploadedFile}
                onSelectCategory={setSelectedCategory}
            />
        </LayoutInner>
    );
}

/** Wrapper to re-mount on param change (route change) */
export default function Chat() {
    const { chatIdParam } = useParams();
    return <ChatPage key={chatIdParam} />;
}
