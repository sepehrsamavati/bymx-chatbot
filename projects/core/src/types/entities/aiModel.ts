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
    /** Price per million units (tokens, characters, minutes, ...) */
    pricePmu: {
        input: number;
        output: number;
    };
    llmInfo: {
        /** `Input + Output` token limit */
        contextWindow: number;
        /** Output tokens limit */
        maxOutputTokens: number;
        canStream: boolean;
    };
}

export type AIModelDBModel = StoredEntity<AIModel>;

export type AIModelViewModel = Pick<AIModel, 'id' | 'title'> & {
    /** A number `from 0 to 5`; `0` as free and `5` as very expensive */
    costRatio: number;
};
