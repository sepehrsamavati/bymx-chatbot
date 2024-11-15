import tgCall from "../helpers/call.js";
import { getChatListPanel } from "../helpers/messages.js";
import { UserMode } from "../../../types/enums/userMode.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const promptHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.TextMessage,
    mode: UserMode.General.Normal,
    async handler(context, update) {
        const text = update.message?.text as string;

        await tgCall(
            TelegramMethods.SendChatAction,
            {
                chat_id: update.message?.chat.id,
                action: "typing"
            }
        );

        const res = await context.services.openAIApplication.textMessage(context.user, text);

        if (res.ok)
            await tgCall(
                TelegramMethods.SendMessage,
                {
                    chat_id: update.message?.chat.id,
                    reply_to_message_id: update.message?.message_id,
                    text: res.data.output,
                    parse_mode: res.data.isComplete ? "Markdown" : undefined,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: `⚡ ${res.data.pointUsage}`, callback_data: "usedPointsForMessage" }]
                        ]
                    }
                }
            );
        else
            switch (res.message) {
                case "selectChatBeforeUse": {
                    const _chatList = await getChatListPanel(context);

                    if (!_chatList)
                        return null;

                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.message?.chat.id,
                            ..._chatList,
                            text: context.uiText.selectChatBeforeUse
                        }
                    );
                }
                    break;
                case "noActiveSubscription":
                case "planPointsFinished":
                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.message?.chat.id,
                            reply_to_message_id: update.message?.message_id,
                            text: context.getUit(res.message) + `\n\n${context.uiText.buyPlans}: /plans`
                        }
                    );
                    break;
                default:
                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.message?.chat.id,
                            reply_to_message_id: update.message?.message_id,
                            text: context.getUit(res.message)
                        }
                    );
            }

        return { shouldContinue: false };
    }
}
