export type HelloResponse = {
    connectionId: string;
}

export type SubmitPromptResult = {
    pointUsage: number;
    /** The output is completed and not truncated/canceled/errored during generating */
    isComplete: boolean;
    /** Is the last chunk */
    finished?: true;
    plainText?: string;
    outputChunk?: { index: number; value: string; };
};
