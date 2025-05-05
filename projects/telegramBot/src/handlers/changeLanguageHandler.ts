import tgCall from "../helpers/call.js";
import { UIText } from "bymx-core/shared";
import { getPanel } from "../modules/messages.js";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";

export const changeLanguageHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.CallbackQuery,
    chatTypes: ["all"],
    async handler(context, update) {
        const queryData = update.callback_query?.data;

        if (!update.callback_query?.message || context.chat?.type !== "private")
            return null;

        if (queryData?.startsWith("setLanguage_")) {
            const targetLanguage = queryData.replace("setLanguage_", "");
            const updateResult = await context.services.userApplication.setLanguage(context.user, targetLanguage);

            if (!updateResult.ok) {
                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: context.getUit(updateResult.message),
                        show_alert: true,
                        cache_time: 1,
                    }
                );
                return { shouldContinue: false };
            }

            context.uiText = UIText.default[context.user.lang]; // update memory

            const _panel = await getPanel(context);

            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id,
                    ..._panel
                }
            );
        }

        return null;
    }
}
