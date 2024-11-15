import type { User } from "./entities/user";
import type { UserModeType } from "./enums/userMode";
import type CoreServices from "../projects/core/Container";
import type { TelegramMethods } from "./enums/telegramMethods";
import type { TelegramUpdateType } from "./enums/telegramUpdateHandler";
import type { UITextLanguage, UITextOptionalKey } from "../projects/core/i18n/UIText";

export type ChatID = number;

export type MessageID = number;

export type Chat = {
    id: ChatID;
    type: "private" | "group" | "supergroup" | "channel";
    username?: string;
    first_name?: string;
    last_name?: string;
    is_forum?: true;
}

type TelegramUser = {
    id: ChatID;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: true;
    can_join_groups?: boolean;
    supports_inline_queries?: boolean;
    can_connect_to_business?: boolean;
    has_main_web_app?: boolean;
};

type MessageEntityType = 'url' | 'spoiler'
    | 'text_link' | 'code' | 'blockquote' | 'underline' | 'strikethrough'
    | 'italic' | 'email' | 'bold' | 'hashtag' | 'mention' | 'cashtag'
    | 'bot_command' | 'text_mention' | 'custom_emoji' | 'pre';

export type TelegramMessage = {
    text?: string;
    date: number;
    chat: Chat;
    from: TelegramUser;
    message_id: MessageID;
    entities?: {
        offset: number;
        length: number;
        url?: string;
        type: MessageEntityType;
    }[];
    contact?: {
        user_id: ChatID;
        phone_number: string;
    };
    forward_origin?: object;
    reply_to_message?: Omit<TelegramMessage, 'reply_to_message'>;
};

type ChatMemberOwner = {
    status: "creator";
    user: TelegramUser;
    is_anonymous: boolean;
    custom_title?: string;
};

type ChatMemberAdministrator = {
    status: "administrator";
    user: TelegramUser;
    can_be_edited: boolean;
    is_anonymous: boolean;
    can_manage_chat: boolean;
    custom_title?: string;
};

type ChatMemberMember = {
    status: "member";
    user: TelegramUser;
};

type ChatMemberRestricted = {
    status: "restricted";
    user: TelegramUser;
    is_member: boolean;
    can_send_messages: boolean;
    until_date: number;
};

type ChatMemberLeft = {
    status: "left";
    user: TelegramUser;
};

type ChatMemberBanned = {
    status: "kicked";
    user: TelegramUser;
    until_date: number;
};

type ChatMember = ChatMemberOwner | ChatMemberAdministrator | ChatMemberMember | ChatMemberRestricted | ChatMemberLeft | ChatMemberBanned;

type ChatMemberUpdated = {
    chat: Chat;
    from: TelegramUser;
    date: number;
    old_chat_member: ChatMember;
    new_chat_member: ChatMember;
};

export type TelegramUpdateObject = {
    update_id: number;
    callback_query?: {
        id: string;
        data: string;
        from: TelegramUser;
        message: TelegramMessage;
    }
    inline_query?: {
        id: string;
        query: string;
        from: TelegramUser;
    }
    message?: TelegramMessage;
    my_chat_member?: ChatMemberUpdated;
    channel_post?: TelegramMessage;
}

type TelegramResponseBase<T, OK = boolean> = OK extends true ? {
    ok: true;
    result: T;
} : {
    ok: false;
    result: null;
}

type TelegramResponseMap = {
    [TelegramMethods.SendText]: TelegramResponseBase<TelegramMessage>;
    [TelegramMethods.SendMessage]: TelegramResponseBase<TelegramMessage>;
    [TelegramMethods.GetMe]: TelegramResponseBase<TelegramUser>;
    [TelegramMethods.GetUpdates]: TelegramResponseBase<TelegramUpdateObject[]>;
    [TelegramMethods.DeleteMessage]: TelegramResponseBase<null>;
    [TelegramMethods.SetMessageReaction]: TelegramResponseBase<null>;
}

export type TelegramResponse<Method extends TelegramMethods> = Method extends keyof TelegramResponseMap ? TelegramResponseMap[Method] : never;



export type RequestContext = {
    services: CoreServices['applications'];
    user: User;
    uiText: UITextLanguage;
    getUit: (keyOrMessage: UITextOptionalKey) => string;
    readonly callStack: IUpdateHandler[];
}

type TelegramCall = {
    text: UITextOptionalKey;
}

type ResponseContextBase = {
    /** Should call next handler or not */
    shouldContinue?: boolean;
}

type ResponseContextActions = (
    {
        /** Call Telegram method */
        call: TelegramCall;
    }
    // | {
    //     /** Multiple Telegram methods (executed concurrently) */
    //     concurrentCalls: TelegramCall[];
    // } | {
    //     /** Multiple ordered Telegram methods (executed in order) */
    //     orderedCalls: (next: (call: TelegramCall | null) => Promise<TelegramResponse | null>) => Promise<unknown>;
    // }
);

type ResponseContext = (
    {
        /** No action */
        call?: null;
    }
    | ResponseContextActions) & ResponseContextBase;

export type IUpdateHandler = {
    updateType: TelegramUpdateType | TelegramUpdateType[];
    handler: (context: RequestContext, update: TelegramUpdateObject) => Promise<ResponseContext | null>;
    mode?: UserModeType | UserModeType[];
}
