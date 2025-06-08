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
        if (!update.callback_query?.message)
            return null;

        const queryData = update.callback_query?.data as string;

        if (queryData === "newChat") {
            const canCreateNewChat = await context.services.aiChatApplication.canCreateNewChat(context.user.id);

            if (!canCreateNewChat.ok) {
                return {
                    call: {
                        text: canCreateNewChat.message === "reachedDailyChatCountLimit" ? stringHelper.formatter(context.uiText.reachedDailyChatCountLimit, config.dailyChatCountLimit) : canCreateNewChat.message
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

            const createChatResult = await context.services.aiChatApplication.create({
                title: "",
                isHidden: false,
                model: model,
                user: context.user,
                behavior: AIChatBehavior.None
            });

            if (createChatResult.ok && createChatResult.data) {

                await context.services.userApplication.setUserSelectedChatById(context.user, createChatResult.data);

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
            else
                return {
                    call: {
                        text: createChatResult.message
                    }
                };
        }

        return null;
    }
}
