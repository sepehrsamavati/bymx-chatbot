import tgCall from "../helpers/call.js";
import { crypto } from "bymx-core/server";
import { UserMode } from "bymx-core/shared";
import emojiIcon from "../helpers/emojiIcon.js";
import type { IUpdateHandler } from "../types/telegram.js";
import startLinkGenerator from "../helpers/startLinkGenerator.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { convertToTelegramMarkdown } from "../helpers/telegramMarkdown.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";

/** User ID <=> Text */
const queryStore = new Map<string, string>();

export const inlineQueryHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: [
        TelegramUpdateType.InlineQuery,
        TelegramUpdateType.CallbackQuery,
    ],
    chatTypes: ["all"],
    mode: UserMode.General.Normal,
    async handler(context, update) {

        if (update.inline_query) {

            const queryData = update.inline_query.query;

            if (queryData.length === 0)
                return null;

            queryStore.delete(context.user.id);

            const res = await tgCall(
                TelegramMethods.AnswerInlineQuery,
                {
                    inline_query_id: update.inline_query?.id,
                    results: [
                        {
                            type: "article",
                            id: crypto.randomString(16),
                            title: context.uiText.chatWithAi, //res.data.plainText.length > 40 ? `${res.data.plainText.slice(0, 30)}...` : res.data.plainText,
                            input_message_content: {
                                message_text: emojiIcon.history
                            },
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: emojiIcon.play, callback_data: "processInlineMessage" }],
                                    [{ text: `${emojiIcon.history} ${context.uiText.chatWithAi}`, url: startLinkGenerator(context.botUsername) }],
                                ]
                            },
                        }
                    ],
                    cache_time: 60,
                    is_personal: true,
                }
            );

            if (res?.result)
                queryStore.set(context.user.id, queryData);
        } else if (update.callback_query && update.callback_query.data === "processInlineMessage") {
            const inputText = queryStore.get(context.user.id);

            if (!inputText) {
                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query.id,
                        text: `${emojiIcon.failed} ${context.uiText.invalid}`,
                        show_alert: true,
                        cache_time: 1,
                    }
                );
                return null;
            }

            queryStore.delete(context.user.id);

            const res = await context.services.aiApplication.multiModalChatCompletion({
                user: context.user,
                createDefaultChat: true,
                inputMessage: {
                    text: inputText,
                },
                history: {
                    historyMessagesCount: 0
                }
            });

            if (res.ok && res.data) {
                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        inline_message_id: update.callback_query.inline_message_id,
                        text: convertToTelegramMarkdown(`${emojiIcon.help} ${inputText}\n\n${res.data.plainText}`),
                        parse_mode: res.data.isComplete ? "Markdown" : undefined,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `${emojiIcon.point} ${res.data.pointUsage}`, callback_data: "usedPointsForMessage" }, { text: `${emojiIcon.model} ${context.user.selectedChat?.model.title ?? '-'}`, callback_data: "modelProcessedThisMessage" }],
                                [{ text: `${emojiIcon.history} ${context.uiText.chatWithAi}`, url: startLinkGenerator(context.botUsername) }],
                            ]
                        },
                    }
                );
            }
        } else {
            return { shouldContinue: true };
        }

        return { shouldContinue: false };
    }
}
