import tgCall from "../helpers/call.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";
import { getPlanBuyPanel, getPlanInfoPanel, getPlanList } from "../helpers/messages.js";

export const planHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.All,

    async handler(context, update) {
        const queryData = update.callback_query?.data;

        if (queryData === "planList") {
            const planList = await getPlanList(context);

            if (!planList)
                return null;

            if (planList === "noPlanAvailable") {
                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: context.uiText.noItemToShow,
                        show_alert: true,
                        cache_time: 600,
                    }
                );
            } else {
                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ...planList
                    }
                );
            }

            return { shouldContinue: false };
        } else if (queryData?.startsWith("viewPlan_")) {
            const planId = queryData.replace("viewPlan_", "");
            const planInfoPanel = await getPlanInfoPanel(context, planId);

            if (!planInfoPanel)
                return null;

            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id,
                    ...planInfoPanel
                }
            );

            return { shouldContinue: false };
        } else if (queryData?.startsWith("buyPlan_")) {
            const planId = queryData.replace("buyPlan_", "");
            const planBuyPanel = await getPlanBuyPanel(context, planId);

            if (!planBuyPanel)
                return null;

            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id,
                    ...planBuyPanel
                }
            );

            return { shouldContinue: false };
        }

        return null;
    }
}
