import type { AIChat } from "./aiChat.js";
import type { AIVoice } from "../enums/aiVoice.js";
import type { LangCode } from "../../i18n/UIText.js";
import type { UserType } from "../enums/userTypes.js";
import type { UserStatus } from "../enums/userStatus.js";
import type { UserModeType } from "../enums/userMode.js";
import type { StoredEntity } from "../contracts/entities.js";
import type { AIChatHistoryMemory } from "../enums/aiChatHistoryMemory.js";

type UserTelegram = {
    id: number;
    mode: UserModeType;
    firstName: string;
    inviteCount: number;
    /** Selected chat */
    selectedChat?: AIChat;
    invite?: {
        by: User['id'];
        used: boolean;
    };
    lastName?: string;
    username?: string;
    phoneNumber?: string;
};

export type User = {
    id: string;
    /** Number of times user entity got retrieved from DB */
    usage: number;
    lastActivity: number;
    status: UserStatus;
    lang: LangCode;
    type: UserType;
    saveMessages: boolean;
    /** Number of messages to resend in chat completion  */
    memoryAmount: AIChatHistoryMemory;
    /** Custom implementation of AI agent memory */
    memory?: {
        on: boolean;
        footprints: string[];
    };
    voiceResponse: {
        on: boolean;
        type: AIVoice;
        languagePrompt?: string;
    };
    telegram?: UserTelegram;
}

export type UserDBModel = StoredEntity<User>;

export type UserViewModel = {
    firstName: string;
    lastName?: string;
    shouldAcceptEula?: boolean;
} & Pick<User, 'id' | 'lang' | 'type' | 'memoryAmount' | 'saveMessages'>;

export type CreateUserModel = Omit<UserDBModel, 'id'>;
export type UpdateUserModel = {

    voiceResponseActive?: User['voiceResponse']['on'];
    voiceResponseType?: User['voiceResponse']['type'];
    voiceResponseLanguagePrompt?: User['voiceResponse']['languagePrompt'];

    memoryOn?: NonNullable<User['memory']>['on'];
    memoryFootprints?: NonNullable<User['memory']>['footprints'];

    telegramInviteUsed?: NonNullable<UserTelegram['invite']>['used'];
    telegramFirstName?: string;
    telegramLastName?: string;
    telegramPhoneNumber?: UserTelegram['phoneNumber'];
    telegramUsername?: UserTelegram['username'];
    telegramMode?: UserTelegram['mode'];
    telegramSelectedChat?: UserTelegram['selectedChat'];

} & Partial<Pick<UserDBModel, 'saveMessages' | 'memoryAmount' | 'lang' | 'isDeleted' | 'status' | 'type'>>;

export type UpsertUserModel = Pick<UserDBModel, 'telegram' | 'lang'>;

export type SearchUserModel = Pick<Partial<UserDBModel>, 'id' | 'isDeleted'> & {
    telegram?: Pick<Partial<UserTelegram>, 'id' | 'phoneNumber' | 'username'>;
} & {
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
        isSupported: boolean;
    } | null;
    paidSubscriptionsRemainingPoints: number | null;
    activePurchasedPlans: number | null;
    /** @todo Requires join */
    // totalOpenAiCost: number | null;
    // totalOpenAiPointUsage: number | null;
    // totalOpenAiMessages: number | null;
};

export type UserInfoViewModel = Omit<UserInfoModel, 'user'> & { user: UserViewModel; };
