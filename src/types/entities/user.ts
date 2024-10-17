import type { UserTier } from "../enums/userTier";
import type { UserType } from "../enums/userTypes";
import type { UserStatus } from "../enums/userStatus";
import type { StoredEntity } from "../contracts/entities";

export type User = {
    id: string;
    tgId: number;
    /** Number of times user entity got retrieved from DB */
    usage: number;
    lastActivity: number;
    status: UserStatus;
    type: UserType;
    tier: UserTier;
    mode: number;
    firstName: string;
    lastName?: string;
    username?: string;
}

export type UserDBModel = StoredEntity<User>;

export type CreateUserModel = Omit<UserDBModel, 'id'>;
export type UpdateUserModel = Partial<Pick<UserDBModel, 'username' | 'firstName' | 'lastName' | 'isDeleted' | 'mode' | 'status' | 'tier' | 'type'>>;
