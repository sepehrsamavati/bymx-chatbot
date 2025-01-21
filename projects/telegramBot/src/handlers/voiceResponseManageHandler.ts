import tgCall from "../helpers/call.js";
import { aiVoices } from "bymx-core/shared";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";
import { getChangeVoiceResponseTypePanel, getVoiceResponsePanel } from "../helpers/messages.js";

export const voiceResponseManageHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.CallbackQuery,

    async handler(context, update) {
        const queryData = update.callback_query?.data as string;

        if (queryData?.startsWith("selectVoiceResponseType_")) {
            const targetAiVoice = queryData.replace("selectVoiceResponseType_", "");

            const aiVoice = aiVoices.find(item => item === targetAiVoice);

            if (!aiVoice) {
                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: context.uiText.itemNotFound,
                        show_alert: false,
                        cache_time: 10,
                    }
                );
                return { shouldContinue: false };
            }

            const changeResult = await context.services.userApplication.setVoiceResponseType(context.user.id, aiVoice);

            if (changeResult.ok) {
                context.user.voiceResponse.type = aiVoice; // update cache
                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ...await getVoiceResponsePanel(context)
                    }
                );
            }
            else
                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: changeResult.message,
                        show_alert: true,
                        cache_time: 1,
                    }
                );

            return { shouldContinue: false };
        } else if (queryData === "selectVoiceResponseType") {
            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id,
                    ...await getChangeVoiceResponseTypePanel(context)
                }
            );
            return { shouldContinue: false };
        } else if (queryData === "activateVoiceResponse" || queryData === "deactivateVoiceResponse") {
            const activate = queryData === "activateVoiceResponse";
            const res = await context.services.userApplication.toggleVoiceResponse(context.user.id, activate);

            if (!res.ok) {
                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: res.message,
                        show_alert: false,
                        cache_time: 1,
                    }
                );
                return { shouldContinue: false };
            }

            context.user.voiceResponse.on = activate;

            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id,
                    ...await getVoiceResponsePanel(context)
                }
            );

            return { shouldContinue: false };
        }


        return null;
    }
}
