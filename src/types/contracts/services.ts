import type { OpenAIModel } from "../entities/openAIModel.js";
import type { UserTempFile } from "../entities/userTempFile.js";
import type { OpenAIMessage } from "../entities/openAIMessage.js";

export type IOpenAITextResult = {
    output: string;
    isComplete: boolean;
    inputTokens: number;
    outputTokens: number;
};

export type IOpenAITextResultWithFile = IOpenAITextResult & { fileId: string; vectorIds: string[]; };

export type IOpenAIRequest = {
    input: string;
    systemMessage?: string;
    messages: Array<Pick<OpenAIMessage, 'prompt' | 'output'>>;
    tokenLimit?: number;
    modelName: string;
    userId?: string;
};

export type IOpenAIService = {
    multiTextMessage(opts: IOpenAIRequest): Promise<IOpenAITextResult | null>;
    fileSearch(opts: {
        inputMessage: string;
        tempFile: UserTempFile;
        messages: Array<Pick<OpenAIMessage, 'prompt' | 'output'>>;
    }): Promise<IOpenAITextResultWithFile | null>;
}

export type IOpenAIModelCache = {
    getDefault(): Promise<OpenAIModel>;
}

export type IActionLockCache<T> = {
    isLocked(key: T): boolean;
    lock(key: T): void;
    unlock(key: T): void;
}

export type ICacheStorage<T> = {
    get(key: string): T | null;
    set(key: string, value: T): void;
    unset(key: string): boolean;
    exists(key: string): boolean;
}
