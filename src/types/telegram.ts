import type { User } from "./entities/user";
import type { UserModeType } from "./enums/userMode";
import type CoreServices from "../projects/core/Container";
import type { HandlerType, TelegramUpdateType } from "./enums/telegramUpdateHandler";

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
    is_premium?: string;
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
    forward_from?: TelegramUser;
    forward_from_chat?: Chat;
    reply_to_message?: TelegramMessage;
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

type RequestContext = {
    services: CoreServices['applications'];
    user: User;
    readonly callStack: IUpdateHandler[];
}

type ResponseContext = {
    /** Call Telegram method */
    call?: never;
    /** Should call next handler or not */
    shouldContinue?: boolean;
}

export type IUpdateHandler = {
    updateType: TelegramUpdateType | TelegramUpdateType[];
    handlerType: HandlerType;
    handler: (context: RequestContext) => Promise<ResponseContext | null>;
    mode: UserModeType | UserModeType[];
}
