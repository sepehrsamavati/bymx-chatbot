import type { User } from "./user";
import type { OpenAIChat } from "./openAIChat";
import type { StoredEntity } from "../contracts/entities";
import type { UserSubscriptionUsage } from "./userSubscriptionUsage";

export type OpenAIMessage = {
    /** NOTE: Chat's model can be changed by user; Use message `model` field instead */
    chat: OpenAIChat;
    usages: UserSubscriptionUsage[];
    promptUser: User;
    prompt: string;
    output: string;
    /** User saved */
    saved: boolean;
    cost: number;
    points: number;
    responseTime: number;
    /** Name of OpenAI model used for message */
    model: string;
    /** User temp file `fsId` */
    fileId?: string;
}

export type OpenAIMessageDBModel = StoredEntity<OpenAIMessage>;
export type OpenAIMessageBasicInfo = Omit<OpenAIMessage, 'chat' | 'promptUser' | 'usages'>;
