import type { AIVoice } from "../enums/aiVoice.js";
import type { Prompt } from "../entities/prompt.js";
import type { AIModel } from "../entities/aiModel.js";
import type { UserTempFile } from "../entities/userTempFile.js";
import type { OperationResult } from "../../common/dto/OperationResult.js";

export type StreamingChatResponseReader = (chunk: string, finished: boolean) => void;

export type IOpenAITextResult = {
    output: string;
    isComplete: boolean;
    inputTokens: number;
    outputTokens: number;
};

export type IOpenAIAudioResult = {
    output: Buffer;
};

export type IOpenAISpeechToTextResult = {
    output: string;
    /** Seconds */
    duration: number;
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
    streamReader?: StreamingChatResponseReader;
    systemMessages?: (string | null | undefined)[];
    imageUrl?: string;
    messages: Array<Pick<Prompt, 'input' | 'output'>>;
    tokenLimit?: number;
    model: AIModel;
    userId?: string;
    languageCode?: string;
}

export type IOpenAITextToSpeechRequest = {
    inputMessage: string;
    voice: AIVoice;
}

export type IOpenAISpeechToTextRequest = {
    inputAudioPath: string;
    language?: string;
    prompt?: string;
}

export type IOpenAIRequestWithFile = IOpenAIRequest & { tempFile: UserTempFile; };

export type IOpenAIService = {
    readonly textToSpeechPmu: number;
    readonly speechToTextPmu: number;
    multiTextMessage(opts: IOpenAIRequest): Promise<IOpenAITextResult | null>;
    // fileSearch(opts: IOpenAIRequestWithFile): Promise<IOpenAITextResultWithFile>;
    deleteFileById(id: string): Promise<OperationResult>;
    deleteVectorById(id: string): Promise<OperationResult>;
    textToSpeech(opts: IOpenAITextToSpeechRequest): Promise<IOpenAIAudioResult | null>;
    speechToText(opts: IOpenAISpeechToTextRequest): Promise<IOpenAISpeechToTextResult | null>;
    // simpleImageGenerate(userId: string | undefined, prompt: string): Promise<IOpenAIImageResult | null>
}

export type IOpenRouterService = {
    multiTextMessage(opts: IOpenAIRequest): Promise<IOpenAITextResult | null>;
}

export type IAIModelCache = {
    setAll(models: AIModel[]): void;
    getCurrentCache(): AIModel[];
    getModelByName(name: string): AIModel | undefined;
    getDefault(): Promise<AIModel>;
    getFreeModel(): Promise<AIModel | null>;
    getLowCostModel(): Promise<AIModel | null>;
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


export type ExpirableEntity<T> = T & { _expiry: number; };

export type IExpirableCacheStorage<T extends ExpirableEntity<B>, B> = ICacheStorage<T> & {
    getWithExpiryCheck: ICacheStorage<T>['get'];
};
