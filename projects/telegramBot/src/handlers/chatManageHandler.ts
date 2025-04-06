import tgCall from "../helpers/call.js";
import { stringHelper, UserMode } from "bymx-core/shared";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";
import { getChatListPanel, getChatPanel, getDeleteChatConfirmPanel, getModelListPanel } from "../modules/messages.js";

export const chatManageHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: [
        TelegramUpdateType.CallbackQuery,
        TelegramUpdateType.TextMessage
    ],

    async handler(context, update) {
        const text = update.message?.text;
        const queryData = update.callback_query?.message && update.callback_query?.data;

        const editMessageId = {
            chat_id: update.callback_query?.message?.chat.id,
            message_id: update.callback_query?.message?.message_id,
        };

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
                    ...editMessageId,
                    ...chatPanel
                }
            );

            return { shouldContinue: false };
        } else if (queryData?.startsWith("renameChat_")) {
            const chatId = queryData.replace("renameChat_", "");

            if (context.user.selectedChat?.id !== chatId)
                return null;

            await context.services.userApplication.setUserMode(context.user.id, UserMode.ChatManagement.ChangeTitle);

            await tgCall(TelegramMethods.DeleteMessage, editMessageId);

            return {
                call: {
                    text: "sendNewTitle"
                }
            };
        } else if (queryData === "changeChatModel" && context.user.selectedChat) {
            const _modelListPanel = await getModelListPanel(context, context.user.selectedChat.id);

            if (!_modelListPanel)
                return null;

            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    ...editMessageId,
                    ..._modelListPanel
                }
            );

            return { shouldContinue: false };
        } else if (queryData?.startsWith("selectChat_")) {
            const chatId = queryData.replace("selectChat_", "");

            if (context.user.selectedChat?.id !== chatId) {
                const chat = await context.services.aiChatApplication.getUserChatById(context.user.id, chatId);

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
                            ...editMessageId,
                            ..._chatList
                        }
                    );

                    return { shouldContinue: false };
                }
            }

            return null;
        } else if (queryData?.startsWith("changeChatModel_")) {
            const modelId = queryData.replace("changeChatModel_", "");
            const chat = context.user.selectedChat;

            if (!chat)
                return null;

            const result = await context.services.aiChatApplication.setModel(chat, modelId);

            const chatPanel = await getChatPanel(context, chat.id);

            let sendUpdateStatus = true;

            if (chatPanel && result.ok) {
                const res = await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        ...editMessageId,
                        ...chatPanel
                    }
                );

                if (res?.ok)
                    sendUpdateStatus = false;
            }

            return sendUpdateStatus ? {
                call: {
                    text: result.ok ? `✅ ${stringHelper.formatter(context.uiText.itemChangedSuccessfully, context.uiText.model)}` : `❌ ${context.uiText.changeModelFailed}`
                }
            } : { shouldContinue: false };
        } else if (text && context.user.mode === UserMode.ChatManagement.ChangeTitle) {
            const selectedChatId = context.user.selectedChat?.id;

            if (!selectedChatId) {
                await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);
                return null;
            }

            if (text.length < 50) {
                const result = await context.services.aiChatApplication.setTitle(selectedChatId, text);

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
                        text: "titleTooLong"
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
                        ...editMessageId,
                        ..._chatDeleteConfirm
                    }
                );

                return { shouldContinue: false };
            }

            return null;
        } else if (queryData?.startsWith("deleteChat_")) {
            const chatId = queryData.replace("deleteChat_", "");

            if (chatId.length > 0) {
                const deleteResult = await context.services.aiChatApplication.deleteByUser(context.user, chatId);

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
                        ...editMessageId,
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
