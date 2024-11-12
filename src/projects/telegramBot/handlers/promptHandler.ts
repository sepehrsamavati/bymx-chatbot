import tgCall from "../helpers/call.js";
import { UserMode } from "../../../types/enums/userMode.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const promptHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.TextMessage,
    mode: UserMode.General.Normal,
    async handler(context, update) {
        const text = update.message?.text as string;

        await tgCall(
            TelegramMethods.SendChatAction,
            {
                chat_id: update.message?.chat.id,
                action: "typing"
            }
        );

        const res = await context.services.openAIApplication.textMessage(context.user, text);

        await tgCall(
            TelegramMethods.SendMessage,
            {
                chat_id: update.message?.chat.id,
                reply_to_message_id: update.message?.message_id,
                text: res.ok ? res.data : res.message
            }
        );

        return { shouldContinue: false };
    }
}
