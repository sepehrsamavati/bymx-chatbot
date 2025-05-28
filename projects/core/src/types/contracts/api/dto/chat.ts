export type ILlmPromptRequest = {
    chatId: string;
    promptText: string;
    attachmentFileId?: string;
    streamSocketId?: string;
    clientRequestId?: string;
}

export type ILlmPromptResponse = {
    messageId: string | null;
    plainText?: string;
    memoryUpdated?: true;
    isComplete: boolean;
    pointUsage: number;
}
