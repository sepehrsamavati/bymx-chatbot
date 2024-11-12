import type { OpenAIModel } from "../entities/openAIModel.js";
import type { OpenAIMessage } from "../entities/openAIMessage.js";

export type IOpenAIService = {
    multiTextMessage(input: string, messages: Array<Pick<OpenAIMessage, 'prompt' | 'output'>>, modelName: string, userId?: string): Promise<{ output: string; totalTokens?: number; } | null>;
}

export type IOpenAIModelCache = {
    getDefault(): Promise<OpenAIModel>;
}

export type IActionLockCache<T> = {
    isLocked(key: T): boolean;
    lock(key: T): void;
    unlock(key: T): void;
}
