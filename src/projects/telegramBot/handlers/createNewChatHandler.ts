import tgCall from "../helpers/call.js";
import { getModelListPanel } from "../helpers/messages.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const createNewChatHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.CallbackQuery,

    async handler(context, update) {
        const queryData = update.callback_query?.data as string;

        if (queryData === "newChat") {
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
        } else if (queryData.startsWith("selectChatModel")) {
            const modelId = queryData.replace("selectChatModel", "");

            const model = await context.services.openAIModelApplication.getById(modelId);

            if (!model)
                return null;

            const chatId = await context.services.openAIChatApplication.create({
                title: "",
                isHidden: false,
                model: model,
                user: context.user
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
