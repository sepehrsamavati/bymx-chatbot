import type { User } from "./user";
import type { OpenAIPlan } from "./openAIPlan"
import type { FlattenToIDs, StoredEntity } from "../contracts/entities";

export type UserSubscription = {
    user: User;
    plan: OpenAIPlan;
}

export type StoredUserSubscription = StoredEntity<UserSubscription>;

export type CreateUserSubscription = FlattenToIDs<StoredUserSubscription, 'user' | 'plan'>; 
