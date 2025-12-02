import tgCall from "../helpers/call.js";
import { config } from "bymx-core/server";
import { UserMode } from "bymx-core/shared";
import emojiIcon from "../helpers/emojiIcon.js";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";
import { getPanel, getTextModelUsageListPanel, getPlanList, getVoiceResponsePanel, getAiToolsPanel, getModelListPanel, getUserSubscriptionsList } from "../modules/messages.js";

export const userCommandHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.TextMessage,

    async handler(context, update) {
        const text = update.message?.text as string;

        let isCommand = update.message?.entities?.at(0)?.type === "bot_command";

        const command = text;

        switch (command) {
            case "/cancel":
                let canceled = false;

                if ((await context.services.paymentApplication.cancel(context.user.id)).ok) {
                    canceled = true;
                    await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);
                }
                else if (context.user.telegram?.mode !== UserMode.General.Normal)
                    canceled = (await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal)).ok;

                return {
                    shouldContinue: false,
                    call: {
                        text: canceled ? "canceled" : "noOperationToCancel"
                    }
                };
            case "/change_model":
                if (!context.user.telegram?.selectedChat)
                    return {
                        call: {
                            text: "selectChatBeforeUse"
                        }
                    };

                const _modelListPanel = await getModelListPanel(context, context.user.telegram?.selectedChat.id);

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
            case "/clear":
                const result = await context.services.aiChatApplication.clearUserSelectedChatHistory(context.user);

                return {
                    call: {
                        text: `${result.ok ? emojiIcon.ok : emojiIcon.failed} ${context.getUit(result.message)}`
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
                if (context.user.telegram?.mode !== UserMode.General.Normal)
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
                const modelUsageList = await getTextModelUsageListPanel(context);

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
            case "/buy_plan":
            case "/buy_plans":
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
            case "/plans":
                const subscriptionsList = await getUserSubscriptionsList(context);

                if (!subscriptionsList)
                    return null;

                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        message_id: update.message?.message_id,
                        reply_parameters: {
                            allow_sending_without_reply: true,
                            message_id: update.message?.message_id
                        },
                        ...subscriptionsList
                    }
                );
                return { shouldContinue: false };
            case "/web_app":
                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        text: (
                            `${emojiIcon.phoneInHand} ${context.uiText.webApplication}`
                            + `\n\n${context.uiText.webApplicationDescription}`
                        ),
                        reply_markup: {
                            inline_keyboard: [
                                [{
                                    text: `${emojiIcon.phone} ${context.uiText.runWebApplication}`,
                                    web_app: {
                                        url: config.apiServer.baseAddress + "ui/tgAuth"
                                    }
                                }]
                            ]
                        }
                    }
                );
                return { shouldContinue: false };
        }

        return { shouldContinue: !isCommand };
    }
}
