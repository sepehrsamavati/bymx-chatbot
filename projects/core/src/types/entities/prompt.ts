import type { User } from "./user";
import type { AIChat } from "./aiChat";
import type { StoredEntity } from "../contracts/entities";
import type { UserSubscriptionUsage } from "./userSubscriptionUsage";

export type Prompt = {
    /** NOTE: Chat's model can be changed by user; Use message `model` field instead */
    chat?: AIChat;
    usages: UserSubscriptionUsage[];
    promptUser: User;
    /** User input */
    input: string;
    /** Model output */
    output: string;
    /** User saved */
    saved: boolean;
    cost: number;
    points: number;
    responseTime: number;
    /** Name of model used for message */
    model: string;
    /** User temp file `fsId` */
    fileId?: string;
}

export type PromptDBModel = StoredEntity<Prompt>;
export type PromptBasicInfo = { id: string; } & Omit<Prompt, 'chat' | 'promptUser' | 'usages'>;
export type PromptViewModel = Pick<PromptBasicInfo, 'id' | 'input' | 'output' | 'points'>;
