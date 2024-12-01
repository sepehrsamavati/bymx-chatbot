import type { User } from "./user";
import type { Plan } from "./plan";
import type { OpenAIChat } from "./openAIChat";
import type { StoredEntity } from "../contracts/entities";

export type OpenAIMessage = {
    /** NOTE: Chat's model can be changed by user; Use message `model` field instead */
    chat: OpenAIChat;
    plan?: Plan;
    promptUser: User;
    prompt: string;
    output: string;
    /** User saved */
    saved: boolean;
    cost: number;
    points: number;
    /** Name of OpenAI model used for message */
    model: string;
    /** User temp file `fsId` */
    fileId?: string;
}

export type OpenAIMessageDBModel = StoredEntity<OpenAIMessage>;
export type OpenAIMessageBasicInfo = Omit<OpenAIMessage, 'chat' | 'plan' | 'promptUser'>;
