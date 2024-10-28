import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const userCommandHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.TextMessage,

    async handler(context, update) {
        const text = update.message?.text as string;

        if (!text.startsWith('/'))
            return null;

        return null;
    }
}
