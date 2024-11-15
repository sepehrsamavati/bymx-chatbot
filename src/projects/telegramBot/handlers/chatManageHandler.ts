import tgCall from "../helpers/call.js";
import { UserMode } from "../../../types/enums/userMode.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";
import { getChatListPanel, getChatPanel, getDeleteChatConfirmPanel } from "../helpers/messages.js";

export const chatManageHandler: IUpdateHandler = {
    updateType: [
        TelegramUpdateType.CallbackQuery,
        TelegramUpdateType.TextMessage
    ],

    async handler(context, update) {
        const text = update.message?.text;
        const queryData = update.callback_query?.data;

        if (queryData?.startsWith("manageChat_")) {
            const chatId = queryData.replace("manageChat_", "");

            if (context.user.selectedChat?.id !== chatId)
                return null;

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
        } else if (queryData?.startsWith("renameChat_")) {
            const chatId = queryData.replace("renameChat_", "");

            if (context.user.selectedChat?.id !== chatId)
                return null;

            await context.services.userApplication.setUserMode(context.user.id, UserMode.ChatManagement.ChangeTitle);

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
            const selectedChatId = context.user.selectedChat?.id;

            if (!selectedChatId) {
                await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);
                return null;
            }

            if (text.length < 50) {
                const result = await context.services.openAIChatApplication.setTitle(selectedChatId, text);

                if (result.ok) {
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
        } else if (queryData?.startsWith("confirmDeleteChat_")) {
            const chatId = queryData.replace("confirmDeleteChat_", "");

            if (chatId.length > 0) {
                const _chatDeleteConfirm = await getDeleteChatConfirmPanel(context, chatId);

                if (!_chatDeleteConfirm)
                    return null;

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ..._chatDeleteConfirm
                    }
                );

                return { shouldContinue: false };
            }

            return null;
        } else if (queryData?.startsWith("deleteChat_")) {
            const chatId = queryData.replace("deleteChat_", "");

            if (chatId.length > 0) {
                const deleteResult = await context.services.openAIChatApplication.deleteByUser(context.user, chatId);

                if (!deleteResult.ok)
                    return {
                        call: {
                            text: deleteResult.message
                        }
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

            return null;
        }

        return null;
    }
}
