import type { OpenAIChat } from "./openAIChat";
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
    /** Selected Open AI chat */
    selectedChat?: OpenAIChat;
    lastName?: string;
    username?: string;
    phoneNumber?: string;
}

export type UserDBModel = StoredEntity<User>;

export type CreateUserModel = Omit<UserDBModel, 'id'>;
export type UpdateUserModel = Partial<Pick<UserDBModel, 'saveMessages' | 'phoneNumber' | 'memoryAmount' | 'username' | 'lang' | 'firstName' | 'lastName' | 'isDeleted' | 'mode' | 'status' | 'type' | 'selectedChat'>>;
export type UpsertUserModel = Pick<UserDBModel, 'tgId' | 'username' | 'lang' | 'firstName' | 'lastName'>;
export type SearchUserModel = Pick<Partial<UserDBModel>, 'id' | 'tgId' | 'isDeleted' | 'username'>;
export type UserInfoModel = {
    user: User;
    remainingDailyFreePoints: number | null;
    activePlans: number | null;
    /** @todo Requires join */
    // totalOpenAiCost: number | null;
    // totalOpenAiPointUsage: number | null;
    // totalOpenAiMessages: number | null;
};
