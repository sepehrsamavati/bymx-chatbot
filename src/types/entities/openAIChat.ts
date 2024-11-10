import type { User } from "./user"
import type { OpenAIModel } from "./openAIModel";
import type { FlattenToIDs, StoredEntity } from "../contracts/entities";

export type OpenAIChat = {
    id: string;
    user: User;
    model: OpenAIModel;
}

export type OpenAIChatDBModel = StoredEntity<OpenAIChat>;

export type CreateOpenAIChat = Pick<FlattenToIDs<OpenAIChat, 'user' | 'model'>, 'user' | 'model'>; 
