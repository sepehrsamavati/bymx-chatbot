import type { User } from "./user"
import type { OpenAIModel } from "./openAIModel";
import type { FlattenToIDs, StoredEntity } from "../contracts/entities";

export type OpenAIChat = {
    id: string;
    title: string;
    isHidden: boolean;
    user: User;
    model: OpenAIModel;
}

export type OpenAIChatDBModel = StoredEntity<OpenAIChat>;

export type CreateOpenAIChat = Pick<OpenAIChat, 'title' | 'isHidden' | 'user' | 'model'>; 
export type SearchOpenAIChat = Partial<FlattenToIDs<OpenAIChatDBModel, 'user' | 'model'>>; 
