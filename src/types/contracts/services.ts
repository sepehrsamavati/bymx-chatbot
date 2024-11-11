import type { OpenAIModel } from "../entities/openAIModel.js";

export type IOpenAIService = {
    simpleMessage(input: string, userId: string): Promise<{ output: string; totalTokens?: number; } | null>;
}

export type IOpenAIModelCache = {
    getDefault(): Promise<OpenAIModel>;
}
