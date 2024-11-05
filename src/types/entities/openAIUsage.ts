import type { User } from "./user"
import type { OpenAIModel } from "./openAIModel";
import type { FlattenToIDs } from "../contracts/entities";

export type OpenAIUsage = {
    user: User;
    model: OpenAIModel;
    cost: number;
    points: number;
}

export type CreateOpenAIUsage = FlattenToIDs<OpenAIUsage, 'user' | 'model'>; 
