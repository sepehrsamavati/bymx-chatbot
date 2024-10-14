import type { UserTier } from "../enums/userTier";
import type { UserType } from "../enums/userTypes";
import type { UserStatus } from "../enums/userStatus";
import type { StoredEntity } from "../contracts/entities";

export type User = {
    id: string;
    tgId: number;
    status: UserStatus;
    type: UserType;
    tier: UserTier;
    firstName: string;
    lastName?: string;
    username?: string;
}

export type UserDBModel = StoredEntity<User>;
