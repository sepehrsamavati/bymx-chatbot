import type { User } from "./user.js"
import type { AIModel } from "./aiModel.js";
import type { AIChatBehavior } from "../enums/aiChatBehavior.js";
import type { FlattenToIDs, StoredEntity } from "../contracts/entities.js";

export type AIChat = {
    id: string;
    title: string;
    isHidden: boolean;
    user: User;
    behavior: AIChatBehavior;
    model: AIModel;
}

export type AIChatDBModel = StoredEntity<AIChat>;

export type CreateAIChat = Pick<AIChat, 'title' | 'isHidden' | 'user' | 'model' | 'behavior'>;
export type SearchAIChat = Partial<FlattenToIDs<AIChatDBModel, 'user' | 'model'>>;
export type UpdateAIChat = Pick<AIChat, 'id'> & Pick<SearchAIChat, 'isDeleted' | 'isHidden' | 'title' | 'model' | 'behavior'>; 
