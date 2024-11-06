import type { User } from "./user"
import type { OpenAIModel } from "./openAIModel";
import type { FlattenToIDs, StoredEntity } from "../contracts/entities";

export type OpenAIUsage = {
    user: User;
    model: OpenAIModel;
    cost: number;
    points: number;
}

export type OpenAIUsageDBModel = StoredEntity<OpenAIUsage>;

export type CreateOpenAIUsage = Pick<FlattenToIDs<OpenAIUsage, 'user' | 'model'>, 'user' | 'model' | 'cost' | 'points'>; 
