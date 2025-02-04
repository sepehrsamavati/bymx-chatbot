import tgCall from "../helpers/call.js";
import { stringHelper } from "bymx-core/shared";
import { AIChatBehavior, config } from "bymx-core/server";
import { getModelListPanel } from "../modules/messages.js";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";

export const createNewChatHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.CallbackQuery,

    async handler(context, update) {
        const queryData = update.callback_query?.data as string;

        if (queryData === "newChat") {
            const canCreateNewChat = await context.services.aiChatApplication.canCreateNewChat(context.user.id);

            if (!canCreateNewChat.ok) {
                return {
                    call: {
                        text: canCreateNewChat.message === "reachedChatCountLimit" ? stringHelper.formatter(context.uiText.reachedChatCountLimit, config.chatCountLimit) : canCreateNewChat.message
                    }
                };
            }

            const modelList = await getModelListPanel(context)

            if (!modelList)
                return null;

            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id,
                    ...modelList
                }
            );

            return { shouldContinue: false };
        } else if (queryData.startsWith("selectChatModel_")) {
            const modelId = queryData.replace("selectChatModel_", "");

            const model = await context.services.aiModelApplication.getById(modelId);

            if (!model)
                return null;

            const chatId = await context.services.aiChatApplication.create({
                title: "",
                isHidden: false,
                model: model,
                user: context.user,
                behavior: AIChatBehavior.None
            });

            if (chatId) {

                await context.services.userApplication.setUserSelectedChatById(context.user, chatId);

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        text: `✅ ${context.uiText.chatCreatedSuccessfully}`,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `🤖 ${context.uiText.panel}`, callback_data: "panel" }],
                            ]
                        }
                    }
                );

                return { shouldContinue: false };
            }
        }

        return null;
    }
}
