import tgCall from "../helpers/call.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const createNewChatHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.CallbackQuery,

    async handler(context, update) {
        const queryData = update.callback_query?.data as string;

        if (queryData === "newChat") {
            const models = await context.services.openAIModelApplication.getAll();

            if (!models)
                return null;

            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id,
                    text: context.uiText.selectModel,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: `↩ ${context.uiText.return}`, callback_data: "chats" }, { text: `🤖 ${context.uiText.panel}`, callback_data: "panel" }],
                            ...models.map(model => [{ text: model.title, callback_data: `selectChatModel${model.id}` }])
                        ]
                    }
                }
            );

            return { shouldContinue: false };
        } else if (queryData.startsWith("selectChatModel")) {
            const modelId = queryData.replace("selectChatModel", "");

            const model = await context.services.openAIModelApplication.getById(modelId);

            if (!model)
                return null;

            const chatId = await context.services.openAIChatApplication.create({
                title: "foo",
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
