export type ILlmPromptRequest = {
    chatId: string;
    promptText: string;
    attachmentFileId?: string;
    streamSocketId?: string;
    clientRequestId?: string;
}

export type ILlmPromptResponse = {
    plainText?: string;
    isComplete: boolean;
    pointUsage: number;
}
