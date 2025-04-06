import tgCall from "../helpers/call.js";
import { getAdminPanel } from "../modules/messages.js";
import { accessHelper, UserType } from "bymx-core/shared";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";

export const adminPanelHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.CallbackQuery,

    async handler(context, update) {
        if (!accessHelper(UserType.Admin, context.user.type))
            return { shouldContinue: true };

        const queryData = update.callback_query?.message && update.callback_query?.data;

        switch (queryData) {
            case "adminPanel": {
                const _panel = await getAdminPanel(context);

                if (!_panel)
                    return null;

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message?.chat.id,
                        message_id: update.callback_query?.message?.message_id,
                        ..._panel
                    }
                );

                return { shouldContinue: false };
            };
        }

        return { shouldContinue: true };
    }
}
