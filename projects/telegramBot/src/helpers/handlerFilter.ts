import { UserModeType } from "bymx-core/shared";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";

export const isCompatibleType = (handler: IUpdateHandler, type: TelegramUpdateType | TelegramUpdateType[]) => {
    const handlerTypes = Array.isArray(handler.updateType) ? handler.updateType : [handler.updateType];
    const types = Array.isArray(type) ? type : [type];

    if (handlerTypes.includes(TelegramUpdateType.All))
        return true;

    if (handlerTypes.some(t => types.includes(t)))
        return true;

    if (
        handlerTypes.includes(TelegramUpdateType.Message)
        && types.some(t =>
            t === TelegramUpdateType.TextMessage
            || t === TelegramUpdateType.Audio
            || t === TelegramUpdateType.Contact
            || t === TelegramUpdateType.Document
            || t === TelegramUpdateType.Photo
            || t === TelegramUpdateType.Location
            || t === TelegramUpdateType.Voice
            || t === TelegramUpdateType.Sticker
        )
    )
        return true;

    return false;
};

export const isCompatibleUserMode = (handler: IUpdateHandler, mode: UserModeType | UserModeType[]) => {
    if (typeof handler.mode !== "number")
        return true;

    const handlerModes = Array.isArray(handler.mode) ? handler.mode : [handler.mode];
    const modes = Array.isArray(mode) ? mode : [mode];

    if (handlerModes.some(t => modes.includes(t)))
        return true;

    return false;
};

