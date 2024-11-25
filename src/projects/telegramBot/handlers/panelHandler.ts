import tgCall from "../helpers/call.js";
import { UserMode } from "../../../types/enums/userMode.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";
import { getChatListPanel, getModelUsageListPanel, getPanel } from "../helpers/messages.js";

export const panelHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.CallbackQuery,
    mode: UserMode.General.Normal,
    async handler(context, update) {
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
            case "usedPointsForMessage": {

                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: context.uiText.usedPointsForThisMessage,
                        show_alert: true,
                        cache_time: 600,
                    }
                );

                return { shouldContinue: false };
            };
            case "modelProcessedThisMessage": {

                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: context.uiText.modelProcessedThisMessage,
                        show_alert: true,
                        cache_time: 600,
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
            case "modelsUsage": {
                const modelUsageList = await getModelUsageListPanel(context);

                if (!modelUsageList)
                    return null;

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ...modelUsageList
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

        return null;
    }
}
