import tgCall from "../helpers/call.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const selectChatHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.CallbackQuery,

    async handler(context, update) {
        const queryData = update.callback_query?.data as string;

        if (queryData.startsWith("selectChat")) {
            const chatId = queryData.replace("selectChat", "");

            if (context.user.selectedChat?.id !== chatId) {
                const chat = await context.services.openAIChatApplication.getUserChatById(context.user.id, chatId);

                if (!chat)
                    return null;

                await context.services.userApplication.setUserSelectedChatById(context.user, chat.id);
            }

            await tgCall(
                TelegramMethods.SendMessage,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    text: "✅"
                }
            );

            return { shouldContinue: false };
        }

        return null;
    }
}
