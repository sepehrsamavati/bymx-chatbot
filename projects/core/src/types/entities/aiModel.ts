import type { AIModelType } from "../enums/aiModelType.js";
import type { StoredEntity } from "../contracts/entities.js";
import type { AIModelProvider } from "../enums/aiModelProvider.js";

export type AIModel = {
    id: string;
    /** Model name */
    name: string;
    /** Title for user view */
    title: string;
    /** Model type (text, audio, ...) */
    type: AIModelType;
    provider: AIModelProvider;
    /** Assistant ID */
    assistants: {
        /** File search assistant ID (OpenAI) */
        fileSearch?: string;
    };
    /** Price per million units (tokens, characters, minutes, ...) */
    pricePmu: {
        input: number;
        output: number;
        inputText: number;
        outputText: number;
        inputAudio: number;
        outputAudio: number;
        inputImage: number;
        outputImage: number;
    };
}

export type AIModelDBModel = StoredEntity<AIModel>;
