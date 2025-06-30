import type { UserModeType, UIText } from "bymx-core/shared";
import type { UserEntity, TelegramApiContract } from "bymx-core/types";
import type { TelegramUpdateType } from "./enums/telegramUpdateHandler.js";
import type { CoreServices, PaymentServices, TelegramApiClient } from "bymx-core/server";

export type Chat = TelegramApiContract.Chat;
export type TelegramUser = TelegramApiContract.TelegramUser;
export type TelegramMessage = TelegramApiContract.TelegramMessage;
export type MessageOriginChat = TelegramApiContract.MessageOriginChat;
export type MessageOriginChannel = TelegramApiContract.MessageOriginChannel;
export type TelegramUpdateObject = TelegramApiContract.TelegramUpdateObject;

export type RequestContext = {
    services: CoreServices['applications'] & PaymentServices['applications'];
    user: UserEntity.User;
    uiText: UIText.UITextLanguage;
    getUit: (keyOrMessage: UIText.UITextOptionalKey) => string;
    apiClient: TelegramApiClient;
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
    handler: (context: RequestContext, update: TelegramUpdateObject, { tgCall }: { tgCall: TelegramApiClient['call'] }) => Promise<ResponseContext | null>;
    mode?: UserModeType | UserModeType[];
}
