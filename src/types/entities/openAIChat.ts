import type { User } from "./user"
import type { OpenAIModel } from "./openAIModel";
import type { FlattenToIDs, StoredEntity } from "../contracts/entities";
import type { OpenAISystemMessage } from "../enums/openAISystemMessages";

export type OpenAIChat = {
    id: string;
    title: string;
    isHidden: boolean;
    user: User;
    behavior: OpenAISystemMessage;
    model: OpenAIModel;
}

export type OpenAIChatDBModel = StoredEntity<OpenAIChat>;

export type CreateOpenAIChat = Pick<OpenAIChat, 'title' | 'isHidden' | 'user' | 'model' | 'behavior'>;
export type SearchOpenAIChat = Partial<FlattenToIDs<OpenAIChatDBModel, 'user' | 'model'>>;
export type UpdateOpenAIChat = Pick<OpenAIChat, 'id'> & Pick<SearchOpenAIChat, 'isDeleted' | 'isHidden' | 'title' | 'model' | 'behavior'>; 
