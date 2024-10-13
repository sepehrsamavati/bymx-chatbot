import type { UserTier } from "../enums/userTier";
import type { UserType } from "../enums/userTypes";
import type { UserStatus } from "../enums/userStatus";
import type { DatabaseModel } from "../../projects/core/infrastructure/repository/mongo/lib/model.type";

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

export type UserDBModel = DatabaseModel<User>;
