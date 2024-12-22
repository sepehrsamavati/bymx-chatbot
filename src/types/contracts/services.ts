import type { Prompt } from "../entities/prompt.js";
import type { AIModel } from "../entities/aiModel.js";
import type { UserTempFile } from "../entities/userTempFile.js";
import type { OperationResult } from "../../projects/core/common/dto/OperationResult.js";

export type IOpenAITextResult = {
    output: string;
    isComplete: boolean;
    inputTokens: number;
    outputTokens: number;
};

export type IOpenAIImageResult = {
    url?: string;
    costUsdCent: number;
    contentPolicyViolation?: boolean;
};

export type IOpenAITextResultWithFile = {
    result?: IOpenAITextResult;
    file: {
        /** OpenAI storage file ID */
        fileId?: string;
        vectorIds?: string[];
    };
};

export type IOpenAIRequest = {
    inputMessage: string;
    systemMessage?: string;
    imageUrl?: string;
    messages: Array<Pick<Prompt, 'input' | 'output'>>;
    tokenLimit?: number;
    model: AIModel;
    userId?: string;
    languageCode?: string;
};

export type IOpenAIRequestWithFile = IOpenAIRequest & { tempFile: UserTempFile; };

export type IOpenAIService = {
    multiTextMessage(opts: IOpenAIRequest): Promise<IOpenAITextResult | null>;
    fileSearch(opts: IOpenAIRequestWithFile): Promise<IOpenAITextResultWithFile>;
    deleteFileById(id: string): Promise<OperationResult>;
    deleteVectorById(id: string): Promise<OperationResult>;
    // simpleImageGenerate(userId: string | undefined, prompt: string): Promise<IOpenAIImageResult | null>
}

export type IAIModelCache = {
    setAll(models: AIModel[]): void;
    getCurrentCache(): AIModel[];
    getModelByName(name: string): AIModel | undefined;
    getDefault(): Promise<AIModel>;
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
    getAllKeys(): string[];
}
