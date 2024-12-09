import type { UserSubscription } from "./userSubscription";
import type { FlattenToIDs, StoredEntity } from "../contracts/entities";

export type UserSubscriptionUsage = {
    id: string;
    date: Date;
    points: number;
    userSubscription: UserSubscription;
}

export type UserSubscriptionUsageDBModel = StoredEntity<Omit<UserSubscriptionUsage, 'date'>>;

export type CreateUserSubscriptionUsage = FlattenToIDs<Omit<UserSubscriptionUsageDBModel, 'id'>, 'userSubscription'>;
// export type SearchUserSubscriptionUsage = Pick<UserSubscriptionUsageDBModel, 'isDeleted'>;
// export type UpdateUserSubscription = { id: string } & Pick<UserSubscriptionDBModel, 'isFinished'>; 
