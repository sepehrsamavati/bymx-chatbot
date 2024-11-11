import tgCall from "../helpers/call.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const userCommandHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.TextMessage,

    async handler(context, update) {
        const text = update.message?.text as string;

        switch (text.toLowerCase()) {
            case "/start":
                return {
                    call: {
                        text: "Welcome"
                    }
                };

            case "/chats": {
                const chats = await context.services.openAIChatApplication.getVisibleChats(context.user.id);

                if (!chats)
                    return null;

                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        text: "💬",
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "➕", callback_data: "newChat" }],
                                ...chats.map(chat => [
                                    context.user.selectedChat?.id === chat.id
                                        ? { text: `✅ ${chat.caption} `, callback_data: "nonce" }
                                        : { text: chat.caption, callback_data: `selectChat${chat.id}` }
                                ])
                            ]
                        }
                    }
                );

                return {
                    shouldContinue: false
                };
            }
        }

        return null;
    }
}
