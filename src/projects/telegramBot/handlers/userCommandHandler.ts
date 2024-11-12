import tgCall from "../helpers/call.js";
import { UserMode } from "../../../types/enums/userMode.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { getPanel, getModelUsageListPanel } from "../helpers/messages.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const userCommandHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.TextMessage,

    async handler(context, update) {
        const text = update.message?.text as string;

        switch (text.toLowerCase()) {
            case "/start":
                if (context.user.mode !== UserMode.General.Normal)
                    await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);

                await Promise.allSettled([
                    tgCall(
                        TelegramMethods.SetMessageReaction,
                        {
                            chat_id: update.message?.chat.id,
                            message_id: update.message?.message_id,
                            is_big: true,
                            reaction: [
                                {
                                    type: "emoji",
                                    emoji: "👻"
                                }
                            ]
                        }
                    ),
                    tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.message?.chat.id,
                            text: context.uiText._tgStart
                                + `\n\n${context.uiText.help}: /help`,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: `🤖 ${context.uiText.panel}`, callback_data: "panel" }]
                                ]
                            }
                        }
                    )
                ]);

                return { shouldContinue: false };
            case "/help":
                if (context.user.mode !== UserMode.General.Normal)
                    await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);

                await Promise.allSettled([
                    tgCall(
                        TelegramMethods.SetMessageReaction,
                        {
                            chat_id: update.message?.chat.id,
                            message_id: update.message?.message_id,
                            is_big: true,
                            reaction: [
                                {
                                    type: "emoji",
                                    emoji: "🤔"
                                }
                            ]
                        }
                    ),
                    tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.message?.chat.id,
                            text: ``
                                + `\n\n${context.uiText.panel}: /panel\n${context.uiText.termsOfService}: /terms`
                        }
                    )
                ]);

                return { shouldContinue: false };
            case "/terms":
                if (context.user.mode !== UserMode.General.AcceptEULA)
                    await context.services.userApplication.setUserMode(context.user.id, UserMode.General.AcceptEULA);

                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        text: context.uiText._termsOfService
                    }
                );

                return { shouldContinue: false };
            case "/panel":
                if (context.user.mode !== UserMode.General.Normal)
                    await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);

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
            case "/models":
                if (context.user.mode !== UserMode.General.Normal)
                    await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);

                const modelUsageList = await getModelUsageListPanel(context);

                if (!modelUsageList)
                    return null;

                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        reply_to_message_id: update.message?.message_id,
                        ...modelUsageList
                    }
                );

                return { shouldContinue: false };
        }

        return null;
    }
}
