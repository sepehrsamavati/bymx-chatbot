import tgCall from "../helpers/call.js";
import type { IUpdateHandler } from "../types/telegram.js";
import { getGivePhoneNumberPanel } from "../modules/messages.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";

export const phoneNumberGuardHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.All,
    chatTypes: ["all"],

    async handler(context, update) {

        if (context.user.phoneNumber?.length)
            return { shouldContinue: true };

        if (context.chat?.type === "private") {
            const message = update.message || update.callback_query?.message;
            await tgCall(
                TelegramMethods.SendMessage,
                {
                    chat_id: context.user.id,
                    ...getGivePhoneNumberPanel(context),
                    text: context.uiText.sendPhoneNumberToContinue,
                    ...(message ? {
                        reply_parameters: {
                            allow_sending_without_reply: true,
                            message_id: message.message_id,
                        },
                    } : undefined)
                }
            );
        }

        return { shouldContinue: false };
    }
}
