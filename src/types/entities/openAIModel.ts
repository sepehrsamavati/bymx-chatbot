import type { StoredEntity } from "../contracts/entities";
import type { OpenAIModelType } from "../enums/openAIModelType";

export type OpenAIModel = {
    id: string;
    /** OpenAI API model name */
    name: string;
    /** Title for user view */
    title: string;
    /** Model type (text, audio, ...) */
    type: OpenAIModelType;
    /** Assistant ID */
    assistants: {
        /** File search assistant ID */
        fileSearch: string;
    };
    /** Price per million units (tokens, characters, minutes, ...) */
    pricePmu: {
        inputText: number;
        outputText: number;
        inputAudio: number;
        outputAudio: number;
    };
}

export type OpenAIModelDBModel = StoredEntity<OpenAIModel>;
