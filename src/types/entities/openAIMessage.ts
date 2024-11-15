import type { OpenAIChat } from "./openAIChat";
import type { StoredEntity } from "../contracts/entities";
import { OpenAIPlan } from "./openAIPlan";

export type OpenAIMessage = {
    /** NOTE: Chat's model can be changed by used; Use message `model` field instead */
    chat: OpenAIChat;
    plan?: OpenAIPlan;
    prompt: string;
    output: string;
    /** User saved */
    saved: boolean;
    cost: number;
    points: number;
    /** Name of OpenAI model used for message */
    model: string;
    fileId?: string;
}

export type OpenAIMessageDBModel = StoredEntity<OpenAIMessage>;
