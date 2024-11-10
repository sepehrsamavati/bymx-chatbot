import type { User } from "./user";
import type { OpenAIPlan } from "./openAIPlan"
import type { FlattenToIDs, StoredEntity } from "../contracts/entities";

export type UserSubscription = {
    user: User;
    plan: OpenAIPlan;
    expiry: Date;
}

export type UserSubscriptionDBModel = StoredEntity<UserSubscription>;

export type CreateUserSubscription = FlattenToIDs<UserSubscriptionDBModel, 'user' | 'plan'>; 
