export type ILlmPromptRequest = {
    chatId: string;
    promptText: string;
    attachmentFileId?: string;
}

export type ILlmPromptResponse = {
    plainText?: string;
    isComplete: boolean;
    pointUsage: number;
}
