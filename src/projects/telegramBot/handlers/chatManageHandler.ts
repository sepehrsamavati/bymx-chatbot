import tgCall from "../helpers/call.js";
import { UserMode } from "../../../types/enums/userMode.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { getChatListPanel, getChatPanel } from "../helpers/messages.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

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
        } else if (queryData?.startsWith("selectChat_")) {
            const chatId = queryData.replace("selectChat_", "");

            if (context.user.selectedChat?.id !== chatId) {
                const chat = await context.services.openAIChatApplication.getUserChatById(context.user.id, chatId);

                if (!chat)
                    return null;

                const res = await context.services.userApplication.setUserSelectedChatById(context.user, chat.id);

                if (res.ok) {
                    context.user.selectedChat = {
                        ...chat,
                        user: context.user
                    };

                    const _chatList = await getChatListPanel(context);

                    if (!_chatList)
                        return null;

                    await tgCall(
                        TelegramMethods.EditMessageText,
                        {
                            chat_id: update.callback_query?.message.chat.id,
                            message_id: update.callback_query?.message.message_id,
                            ..._chatList
                        }
                    );

                    return { shouldContinue: false };
                }
            }

            return null;
        } else if (text && context.user.mode === UserMode.ChatManagement.ChangeTitle) {
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
