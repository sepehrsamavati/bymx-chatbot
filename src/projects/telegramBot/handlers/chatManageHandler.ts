import tgCall from "../helpers/call.js";
import { UserMode } from "../../../types/enums/userMode.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import type { IUpdateHandler, RequestContext } from "../../../types/telegram.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

const getChatPanel = async (context: RequestContext, chatId: string) => {
    const chat = await context.services.openAIChatApplication.getUserChatById(context.user.id, chatId);

    if (!chat)
        return null;

    return {
        text: `ℹ ${context.uiText.title}: ${chat.title || context.uiText.noTitle}`
            + `\n\n🤖 ${context.uiText.model}: ${chat.model.title}`,
        reply_markup: {
            inline_keyboard: [
                [{ text: `↩ ${context.uiText.return}`, callback_data: "chats" }],
                [{ text: `✍ ${context.uiText.changeTitle}`, callback_data: `renameChat${chat.id}` }],
            ]
        }
    };
};

export const chatManageHandler: IUpdateHandler = {
    updateType: [
        TelegramUpdateType.CallbackQuery,
        TelegramUpdateType.TextMessage
    ],

    async handler(context, update) {
        const text = update.message?.text;
        const queryData = update.callback_query?.data;

        if (queryData?.startsWith("manageChat")) {
            const chatId = queryData.replace("manageChat", "");
            const chatPanel = await getChatPanel(context, chatId);

            if (!chatPanel)
                return null;

            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id,
                    ...chatPanel
                }
            );

            return { shouldContinue: false };
        } if (queryData?.startsWith("renameChat")) {
            const chatId = queryData.replace("renameChat", "");

            const chat = await context.services.openAIChatApplication.getUserChatById(context.user.id, chatId);

            if (!chat)
                return null;

            await context.services.userApplication.setUserMode(context.user.id, UserMode.ChatManagement.ChangeTitle);
            context.services.userSelectedChat.set(context.user.id, chat.id);

            await tgCall(
                TelegramMethods.DeleteMessage,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id
                }
            );

            return {
                call: {
                    text: context.uiText.sendNewTitle
                }
            };
        }

        if (text && context.user.mode === UserMode.ChatManagement.ChangeTitle) {
            const selectedChatId = context.services.userSelectedChat.get(context.user.id);

            if (!selectedChatId) {
                await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);
                return null;
            }

            if (text.length < 50) {
                const result = await context.services.openAIChatApplication.setTitle(selectedChatId, text);

                if (result.ok) {
                    context.services.userSelectedChat.unset(context.user.id);
                    await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);
                }

                const chatPanel = await getChatPanel(context, selectedChatId);

                let sendUpdateStatus = true;

                if (chatPanel && result.ok) {
                    const res = await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.message?.chat.id,
                            ...chatPanel
                        }
                    );

                    if (res?.ok)
                        sendUpdateStatus = false;
                }

                return sendUpdateStatus ? {
                    call: {
                        text: result.ok ? `✅ ${context.uiText.titleChangedSuccessfully}` : `❌ ${context.uiText.changeTitleFailed}`
                    }
                } : { shouldContinue: false };
            } else {
                return {
                    call: {
                        text: context.uiText.titleTooLong
                    }
                };
            }
        }

        return null;
    }
}
