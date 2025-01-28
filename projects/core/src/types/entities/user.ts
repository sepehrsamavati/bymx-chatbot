import type { AIChat } from "./aiChat.js";
import type { AIVoice } from "../enums/aiVoice.js";
import type { LangCode } from "../../i18n/UIText.js";
import type { UserType } from "../enums/userTypes.js";
import type { UserStatus } from "../enums/userStatus.js";
import type { UserModeType } from "../enums/userMode.js";
import type { StoredEntity } from "../contracts/entities.js";
import type { AIChatHistoryMemory } from "../enums/aiChatHistoryMemory.js";

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
    memoryAmount: AIChatHistoryMemory;
    inviteCount: number;
    voiceResponse: {
        on: boolean;
        type: AIVoice;
        languagePrompt?: string;
    };
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
    voiceResponseActive?: User['voiceResponse']['on'];
    voiceResponseType?: User['voiceResponse']['type'];
    voiceResponseLanguagePrompt?: User['voiceResponse']['languagePrompt'];
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
