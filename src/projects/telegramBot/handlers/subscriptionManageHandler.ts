import tgCall from "../helpers/call.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { getSubscriptionInfoPanel } from "../helpers/messages.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const subscriptionManageHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.CallbackQuery,

    async handler(context, update) {
        const queryData = update.callback_query?.data as string;

        if (queryData.startsWith("manageSubscription_")) {
            const subscriptionId = queryData.replace("manageSubscription_", "");
            const subscriptionPanel = await getSubscriptionInfoPanel(context, subscriptionId);

            if (!subscriptionPanel)
                return null;

            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id,
                    ...subscriptionPanel
                }
            );

            return { shouldContinue: false };
        }

        return null;
    }
}
