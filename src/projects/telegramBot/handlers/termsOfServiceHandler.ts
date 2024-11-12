import tgCall from "../helpers/call.js";
import { getPanel } from "../helpers/messages.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const termsOfServiceHandler: IUpdateHandler = {
    updateType: [
        TelegramUpdateType.Message,
        TelegramUpdateType.CallbackQuery
    ],

    async handler(context, update) {

        if (update.callback_query) {

            if (update.callback_query.data === "acceptTos") {
                const _panel = await getPanel(context);

                if (!_panel)
                    return null;

                await Promise.allSettled([
                    tgCall(
                        TelegramMethods.DeleteMessage,
                        {
                            chat_id: update.callback_query?.message.chat.id,
                            message_id: update.callback_query?.message.message_id
                        }
                    ),
                    tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.callback_query?.message.chat.id,
                            ..._panel
                        }
                    )
                ]);

                return { shouldContinue: false };
            }
        }

        if (context.user.status === UserStatus.EULA) {

            const message = update.message ?? update.callback_query?.message;

            await tgCall(
                TelegramMethods.SendMessage,
                {
                    chat_id: message?.chat.id,
                    reply_to_message_id: message?.message_id,
                    text: context.uiText.shouldAcceptTermsOfService
                        + `\n\n${context.uiText._termsOfService}`,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: `✅ ${context.uiText.acceptTos}`, callback_data: "acceptTos" }],
                        ]
                    }
                }
            );

            return { shouldContinue: false };
        }

        return null;
    }
}
