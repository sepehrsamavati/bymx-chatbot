import type { ILlmPromptRequest } from "./dto/chat.js";

export type WebSocketDto<TName extends string, T> = {
    name: TName;
    value: T;
};

export type HelloResponse = WebSocketDto<"helloResponse", {
    connectionId: string;
}>;

export type SubmitPromptResult = WebSocketDto<"promptResult", {
    /** The output is completed and not truncated/canceled/errored during generating */
    isComplete: boolean;
    /** Is the last chunk */
    finished?: true;
    clientRequestId?: ILlmPromptRequest['clientRequestId'];
    outputChunk?: { index: number; value: string; };
}>;
