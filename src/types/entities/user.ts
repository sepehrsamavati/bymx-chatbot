import type { AIChat } from "./aiChat";
import type { UserType } from "../enums/userTypes";
import type { UserStatus } from "../enums/userStatus";
import type { UserModeType } from "../enums/userMode";
import type { StoredEntity } from "../contracts/entities";
import type { LangCode } from "../../projects/core/i18n/UIText";

export type User = {
    id: string;
    tgId: number;
    /** Number of times user entity got retrieved from DB */
    usage: number;
    lastActivity: number;
    status: UserStatus;
    lang: LangCode;
    type: UserType;
    mode: UserModeType;
    firstName: string;
    saveMessages: boolean;
    /** Number of messages to resend in chat completion  */
    memoryAmount: number;
    inviteCount: number;
    invite?: {
        by: User['id'];
        used: boolean;
    };
    /** Selected chat */
    selectedChat?: AIChat;
    lastName?: string;
    username?: string;
    phoneNumber?: string;
}

export type UserDBModel = StoredEntity<User>;

export type CreateUserModel = Omit<UserDBModel, 'id'>;
export type UpdateUserModel = {
    inviteUsed?: NonNullable<User['invite']>['used'];
} & Partial<Pick<UserDBModel, 'saveMessages' | 'phoneNumber' | 'memoryAmount' | 'username' | 'lang' | 'firstName' | 'lastName' | 'isDeleted' | 'mode' | 'status' | 'type' | 'selectedChat'>>;
export type UpsertUserModel = Pick<UserDBModel, 'tgId' | 'username' | 'lang' | 'firstName' | 'lastName' | 'invite'>;
export type SearchUserModel = Pick<Partial<UserDBModel>, 'id' | 'tgId' | 'isDeleted' | 'username'> & {
    status?: {
        equal?: User['status'][];
        notEqual?: User['status'][];
    };
};
export type UserInfoModel = {
    user: User;
    dailyFreePoints: {
        used: number;
        remaining: number;
        total: number;
    } | null;
    paidSubscriptionsRemainingPoints: number | null;
    activePurchasedPlans: number | null;
    /** @todo Requires join */
    // totalOpenAiCost: number | null;
    // totalOpenAiPointUsage: number | null;
    // totalOpenAiMessages: number | null;
};
