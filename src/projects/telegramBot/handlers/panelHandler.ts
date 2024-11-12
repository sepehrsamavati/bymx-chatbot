import tgCall from "../helpers/call.js";
import { UserMode } from "../../../types/enums/userMode.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { getChatListPanel, getPanel } from "../helpers/messages.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const panelHandler: IUpdateHandler = {
    updateType: [
        TelegramUpdateType.TextMessage,
        TelegramUpdateType.CallbackQuery
    ],
    mode: UserMode.General.Normal,
    async handler(context, update) {
        const text = update.message?.text;
        const queryData = update.callback_query?.data;

        switch (queryData) {
            case "panel": {
                const _panel = await getPanel(context);

                if (!_panel)
                    return null;

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ..._panel
                    }
                );

                return { shouldContinue: false };
            };
            case "chats": {
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
            };
            case "activateSaveMessages":
            case "deactivateSaveMessages": {
                const saveMessages = queryData === "activateSaveMessages";
                const res = await context.services.userApplication.setSaveMessages(context.user.id, saveMessages);

                if (!res.ok)
                    return null;

                context.user.saveMessages = saveMessages;

                const _panel = await getPanel(context);

                if (!_panel)
                    return null;

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ..._panel
                    }
                );

                return { shouldContinue: false };
            }
        }

        switch (text) {
            case "/panel":
                if (context.user.mode !== UserMode.General.Normal)
                    await context.services.userApplication.setUserMode(context.user.id, UserMode.ChatManagement.ChangeTitle);

                const _panel = await getPanel(context);

                if (!_panel)
                    return null;

                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        reply_to_message_id: update.message?.message_id,
                        ..._panel
                    }
                );

                return { shouldContinue: false };
        }

        return null;
    }
}
