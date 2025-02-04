import tgCall from "../helpers/call.js";
import { config } from "bymx-core/server";
import emojiIcon from "../helpers/emojiIcon.js";
import { UserMode, UserStatus } from "bymx-core/shared";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";
import { getPanel, getModelUsageListPanel, getPlanList, getVoiceResponsePanel, getAiToolsPanel, getModelListPanel } from "../modules/messages.js";

export const userCommandHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.TextMessage,

    async handler(context, update) {
        const text = update.message?.text as string;

        let isCommand = update.message?.entities?.at(0)?.type === "bot_command";

        let command = "";
        if (isCommand) {
            command = text;
            if (command.startsWith("/start")) {
                // const startParameter = command.replace("/start", "").trimStart();
                command = "/start"; // remove start parameters
            }
        }

        switch (command) {
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

                return { shouldContinue: context.user.status === UserStatus.EULA };
            case "/cancel":
                let canceled = false;
                if (context.user.mode !== UserMode.General.Normal)
                    canceled = (await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal)).ok;
                return {
                    shouldContinue: false,
                    call: {
                        text: canceled ? "canceled" : "noOperationToCancel"
                    }
                };
            case "/change_model":
                if (!context.user.selectedChat)
                    return {
                        call: {
                            text: "selectChatBeforeUse"
                        }
                    };

                const _modelListPanel = await getModelListPanel(context, context.user.selectedChat.id);

                if (!_modelListPanel)
                    return null;

                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        reply_parameters: {
                            allow_sending_without_reply: true,
                            message_id: update.message?.message_id,
                        },
                        ..._modelListPanel
                    }
                );

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
                            text: context.uiText._tgHelp
                                + `\n\n\n${emojiIcon.play} ${context.uiText.restart}: /start`
                                + `\n\n${emojiIcon.textDocument} ${context.uiText.termsOfService}: /terms`
                                + `\n\n${emojiIcon.panel} ${context.uiText.panel}: /panel`
                                + `\n\n${emojiIcon.speaking} ${context.uiText.voiceSettings}: /voice`
                                + `\n\n${emojiIcon.model} ${context.uiText.modelsCost}: /models`
                                + `\n\n${emojiIcon.recycle} ${context.uiText.clearCurrentChatHistory}: /clear`
                                + `\n\n${emojiIcon.help} ${context.uiText.help}: /help`
                        }
                    )
                ]);

                return { shouldContinue: false };
            case "/clear":
                const result = await context.services.aiChatApplication.clearUserSelectedChatHistory(context.user);

                return {
                    call: {
                        text: `${result.ok ? emojiIcon.ok : emojiIcon.failed} ${context.getUit(result.message)}`
                    }
                };
            case "/terms":

                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        text: context.uiText._termsOfService
                    }
                );

                return { shouldContinue: false };
            case "/support":
                return {
                    call: {
                        text: `${emojiIcon.contact} ${context.uiText.contactSupport}: ${config.telegramSupportAccount}`
                    }
                };
            case "/voice":

                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        reply_to_message_id: update.message?.message_id,
                        ...await getVoiceResponsePanel(context)
                    }
                );

                return { shouldContinue: false };
            case "/panel":
            case "/settings":
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
            case "/ai":
            case "/tools":
            case "/ai_tools":
                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        reply_to_message_id: update.message?.message_id,
                        ...await getAiToolsPanel(context)
                    }
                );

                return { shouldContinue: false };
            case "/models":
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
            case "/plans":
                const planList = await getPlanList(context);

                if (!planList)
                    return null;

                if (planList === "noPlanAvailable") {
                    return {
                        call: {
                            text: context.uiText.noItemToShow
                        }
                    };
                } else {
                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.message?.chat.id,
                            message_id: update.message?.message_id,
                            reply_parameters: {
                                allow_sending_without_reply: true,
                                message_id: update.message?.message_id
                            },
                            ...planList
                        }
                    );
                }
                return { shouldContinue: false };
        }

        return { shouldContinue: !isCommand };
    }
}
