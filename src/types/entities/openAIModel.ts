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
    /** Price per million tokens */
    pricePmt: number;
}

export type OpenAIModelDBModel = StoredEntity<OpenAIModel>;
