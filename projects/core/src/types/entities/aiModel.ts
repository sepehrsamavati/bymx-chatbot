import type { AIModelType } from "../enums/aiModelType.js";
import type { StoredEntity } from "../contracts/entities.js";
import type { AIModelProvider } from "../enums/aiModelProvider.js";

export type AIModel = {
    id: string;
    isDeleted: boolean;
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
    };
}

export type AIModelDBModel = StoredEntity<AIModel>;

export type AIModelViewModel = Pick<AIModel, 'id' | 'title'>;
