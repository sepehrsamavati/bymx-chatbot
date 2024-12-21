import type { AIModelType } from "../enums/aiModelType";
import type { StoredEntity } from "../contracts/entities";
import type { AIModelProvider } from "../enums/aiModelProvider";

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
        inputText: number;
        outputText: number;
        inputAudio: number;
        outputAudio: number;
        inputImage: number;
        outputImage: number;
    };
}

export type AIModelDBModel = StoredEntity<AIModel>;
