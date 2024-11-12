import tgCall from "../helpers/call.js";
import { UserMode } from "../../../types/enums/userMode.js";
import stringHelper from "../../core/helpers/stringHelper.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import type { IUpdateHandler, RequestContext } from "../../../types/telegram.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

const getPanel = async (context: RequestContext) => {
    const freePointUsage = await context.services.openAIApplication.getFreePointStatus(context.user.id);

    if (!freePointUsage)
        return null;

    return {
        text: `${context.uiText.dailyFreePoints}: ${freePointUsage.remaining}/${freePointUsage.total}`
            + `\n${context.uiText.saveAndUseHistory}: ${context.user.saveMessages ? `✅ ${context.uiText.enabled} (${stringHelper.formatter(context.uiText.memoryAmount, context.user.memoryAmount)})` : `❌ ${context.uiText.disabled}`}`,
        reply_markup: {
            inline_keyboard: [
                [{ text: context.uiText.chats, callback_data: "chats" }]
            ]
        }
    };
};

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
                const chats = await context.services.openAIChatApplication.getVisibleChats(context.user.id);

                if (!chats)
                    return null;

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        text: chats.length > 0 ? context.uiText.savedChats : context.uiText.noSavedChats,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `↩ ${context.uiText.return}`, callback_data: "panel" }, { text: `➕ ${context.uiText.newChat}`, callback_data: "newChat" }],
                                ...chats.map(chat => [
                                    context.user.selectedChat?.id === chat.id
                                        ? { text: `✅ ${chat.caption} `, callback_data: "nonce" }
                                        : { text: chat.caption, callback_data: `selectChat${chat.id}` }
                                ])
                            ]
                        }
                    }
                );

                return { shouldContinue: false };
            };
        }

        switch (text) {
            case "/panel":
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
                break;
        }

        return null;
    }
}
