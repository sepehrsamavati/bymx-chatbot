import type { ILlmPromptRequest } from "./dto/chat.js";

export type HelloResponse = {
    connectionId: string;
}

export type SubmitPromptResult = {
    pointUsage: number;
    /** The output is completed and not truncated/canceled/errored during generating */
    isComplete: boolean;
    /** Is the last chunk */
    finished?: true;
    clientRequestId?: ILlmPromptRequest['clientRequestId'];
    plainText?: string;
    outputChunk?: { index: number; value: string; };
};
