import type { OpenAIModel } from "../entities/openAIModel.js";

export type IOpenAIService = {
    simpleMessage(input: string, userId: string): Promise<string | null>;
}

export type IOpenAIModelCache = {
    getDefault(): Promise<OpenAIModel>;
}
