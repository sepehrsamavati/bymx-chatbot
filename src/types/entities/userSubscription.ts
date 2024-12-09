import type { User } from "./user";
import type { Plan as PlanClone } from "./plan";
import type { FlattenToIDs, StoredEntity } from "../contracts/entities";

export type UserSubscription = {
    id: string;
    user: User;
    /** Clone of plan data */
    plan: Pick<PlanClone, 'id' | 'title' | 'price' | 'type' | 'points'>;
    /** Plan points used and finished */
    isFinished: boolean;
    expiry: Date;
}

export type UserSubscriptionDBModel = StoredEntity<UserSubscription>;

export type CreateUserSubscription = FlattenToIDs<Omit<UserSubscriptionDBModel, 'id'>, 'user'>;
export type UpdateUserSubscription = { id: string } & Pick<UserSubscriptionDBModel, 'isFinished'>;
export type SearchUserSubscription = {
    user: UserSubscription['user'] | UserSubscription['user']['id'];
    expiryNotBefore?: Date;
    planId?: UserSubscription['plan']['id'];
    planType?: UserSubscription['plan']['type'];
} & Pick<Partial<UserSubscriptionDBModel>, 'isFinished' | 'isDeleted'>; 
