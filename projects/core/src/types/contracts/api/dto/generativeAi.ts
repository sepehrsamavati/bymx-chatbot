export type IImageGenerateRequest = {
    prompt: string;
    type: 1;
}

export type IImageGenerateResult = {
    /** Task internal ID */
    id: string;
    modelName: string;
    pointUsage: number;
}
