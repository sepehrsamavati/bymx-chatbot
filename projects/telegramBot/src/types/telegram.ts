import type { UserEntity } from "bymx-core/types";
import type { UserModeType, UIText } from "bymx-core/shared";
import type { TelegramMethods } from "./enums/telegramMethods.js";
import type { CoreServices, PaymentServices } from "bymx-core/server";
import type { TelegramUpdateType } from "./enums/telegramUpdateHandler.js";

export type ChatID = number;

export type MessageID = number;

export type Chat = {
    id: ChatID;
    type: "private" | "group" | "supergroup" | "channel";
    username?: string;
    title?: string;
    first_name?: string;
    last_name?: string;
    is_forum?: true;
}

export type TelegramUser = {
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

type PhotoSize = {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
}

type Document = {
    file_id: string;
    file_unique_id: string;
    thumbnail?: PhotoSize;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
}

type File = {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
}

type Voice = {
    file_id: string;
    file_unique_id: string;
    duration: number;
    file_size?: number;
    mime_type?: string;
}

export type MessageOriginUser = {
    type: "user";
    date: number;
    sender_user: TelegramUser;
}

export type MessageOriginHiddenUser = {
    type: "hidden_user";
    date: number;
    sender_user_name: string;
}

export type MessageOriginChat = {
    type: "chat";
    date: number;
    sender_chat: Chat;
    author_signature?: string;
}

export type MessageOriginChannel = {
    type: "channel";
    date: number;
    chat: Chat;
    message_id: MessageID;
    author_signature?: string;
}

type MessageOrigin = MessageOriginUser | MessageOriginHiddenUser | MessageOriginChat | MessageOriginChannel;

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
    document?: Document;
    audio?: unknown;
    voice?: Voice;
    photo?: PhotoSize[];
    forward_origin?: MessageOrigin;
    reply_to_message?: Omit<TelegramMessage, 'reply_to_message'>;
    new_chat_members?: Array<TelegramUser>;
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
    error_code: number;
    description?: string;
    result: null;
}

type TelegramResponseMap = {
    [TelegramMethods.SendText]: TelegramResponseBase<TelegramMessage>;
    [TelegramMethods.SendMessage]: TelegramResponseBase<TelegramMessage>;
    [TelegramMethods.SendPhoto]: TelegramResponseBase<TelegramMessage>;
    [TelegramMethods.EditMessageText]: TelegramResponseBase<TelegramMessage>;
    [TelegramMethods.GetMe]: TelegramResponseBase<TelegramUser>;
    [TelegramMethods.GetUpdates]: TelegramResponseBase<TelegramUpdateObject[]>;
    [TelegramMethods.DeleteMessage]: TelegramResponseBase<null>;
    [TelegramMethods.SetMessageReaction]: TelegramResponseBase<null>;
    [TelegramMethods.GetFile]: TelegramResponseBase<File>;
    [TelegramMethods.SetWebhook]: TelegramResponseBase<null>;
    [TelegramMethods.AnswerCallbackQuery]: TelegramResponseBase<null>;
    [TelegramMethods.CopyMessage]: TelegramResponseBase<TelegramMessage>;
    [TelegramMethods.ForwardMessage]: TelegramResponseBase<TelegramMessage>;
    [TelegramMethods.GetChatMember]: TelegramResponseBase<ChatMember>;
}

export type TelegramResponse<Method extends TelegramMethods> = Method extends keyof TelegramResponseMap ? TelegramResponseMap[Method] : never;

export type RequestContext = {
    services: CoreServices['applications'] & PaymentServices['applications'];
    user: UserEntity.User;
    uiText: UIText.UITextLanguage;
    getUit: (keyOrMessage: UIText.UITextOptionalKey) => string;
    readonly chat?: Chat;
    /** Bot Telegram ID */
    readonly botId: number;
    readonly botUsername: string;
    readonly broadcastTrigger: () => void;
    readonly callStack: IUpdateHandler[];
}

type TelegramCall = {
    text: UIText.UITextOptionalKey;
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

export type ResponseContext = (
    {
        /** No action */
        call?: null;
    }
    | ResponseContextActions) & ResponseContextBase;

type UpdateHandlerChatType = "all" | Chat['type'];

export type IUpdateHandler = {
    readonly name: string;
    /** Default: `private` only */
    readonly chatTypes?: Array<UpdateHandlerChatType>;
    updateType: TelegramUpdateType | TelegramUpdateType[];
    handler: (context: RequestContext, update: TelegramUpdateObject) => Promise<ResponseContext | null>;
    mode?: UserModeType | UserModeType[];
}
