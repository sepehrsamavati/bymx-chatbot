import type { User } from "./user";
import type { OpenAIPlan } from "./openAIPlan"
import type { FlattenToIDs, StoredEntity } from "../contracts/entities";

export type UserSubscription = {
    id: string;
    user: User;
    plan: OpenAIPlan;
    /** Plan points used and finished */
    isFinished: boolean;
    expiry: Date;
}

export type UserSubscriptionDBModel = StoredEntity<UserSubscription>;

export type CreateUserSubscription = FlattenToIDs<UserSubscriptionDBModel, 'user' | 'plan'>;
export type UpdateUserSubscription = { id: string } & Pick<UserSubscriptionDBModel, 'isFinished'>; 
