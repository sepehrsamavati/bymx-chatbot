import type { OpenAIChat } from "./openAIChat";
import type { StoredEntity } from "../contracts/entities";

export type OpenAIMessage = {
    chat: OpenAIChat;
    prompt: string;
    output: string;
    /** User saved */
    saved: boolean;
    cost: number;
    points: number;
    fileId?: string;
}

export type OpenAIMessageDBModel = StoredEntity<OpenAIMessage>;
