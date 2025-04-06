import tgCall from "../helpers/call.js";
import emojiIcon from "../helpers/emojiIcon.js";
import type { IUpdateHandler } from "../types/telegram.js";
import { AIChatHistoryMemory, UserMode } from "bymx-core/shared";
import startLinkGenerator from "../helpers/startLinkGenerator.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";
import { get3dModelGenerationPanel, getAiToolsPanel, getChatListPanel, getImageGenerateModePanel, getImageUpscalePanel, getTextModelUsageListPanel, getMusicWithLyricsGenerationPanel, getPanel, getTextBasedCommunicationPanel, getUserSubscriptionsList, getVoiceResponsePanel } from "../modules/messages.js";

export const panelHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.CallbackQuery,
    chatTypes: ["all"],
    async handler(context, update) {
        const queryData = update.callback_query?.data;

        switch (queryData) {
            case "comingSoon": {

                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: context.uiText.comingSoon,
                        show_alert: true,
                        cache_time: 600,
                    }
                );

                return { shouldContinue: false };
            };
            case "usedPointsForMessage": {

                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: context.uiText.usedPointsForThisMessage,
                        show_alert: true,
                        cache_time: 600,
                    }
                );

                return { shouldContinue: false };
            };
            case "modelProcessedThisMessage": {

                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: context.uiText.modelProcessedThisMessage,
                        show_alert: true,
                        cache_time: 600,
                    }
                );

                return { shouldContinue: false };
            };
        }

        if (!update.callback_query?.message || context.chat?.type !== "private")
            return null;

        switch (queryData) {
            case "panel": {
                if (context.user.mode !== UserMode.General.Normal)
                    await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);

                const _panel = await getPanel(context);

                if (!_panel)
                    return null;

                if (update.callback_query?.message.text)
                    await tgCall(
                        TelegramMethods.EditMessageText,
                        {
                            chat_id: update.callback_query?.message.chat.id,
                            message_id: update.callback_query?.message.message_id,
                            ..._panel
                        }
                    );
                else
                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.callback_query?.message.chat.id,
                            reply_parameters: {
                                allow_sending_without_reply: true,
                                message_id: update.callback_query?.message.message_id,
                            },
                            ..._panel
                        }
                    );

                return { shouldContinue: false };
            };
            case "generateImage": {
                if ((await context.services.userApplication.setUserMode(context.user.id, UserMode.UserPrompt.ImageGenerationPrompt)).ok) {
                    await tgCall(
                        TelegramMethods.EditMessageText,
                        {
                            chat_id: update.callback_query?.message.chat.id,
                            message_id: update.callback_query?.message.message_id,
                            ...await getImageGenerateModePanel(context)
                        }
                    );
                    return { shouldContinue: false };
                }

                return null;
            };
            case "aiTools": {
                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ...await getAiToolsPanel(context)
                    }
                );
                return { shouldContinue: false };
            };
            case "textBasedCommunication": {
                const changeModeResult = await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);

                if (changeModeResult.ok) {
                    await tgCall(
                        TelegramMethods.EditMessageText,
                        {
                            chat_id: update.callback_query?.message.chat.id,
                            message_id: update.callback_query?.message.message_id,
                            ...await getTextBasedCommunicationPanel(context)
                        }
                    );
                    return { shouldContinue: false };
                }

                return {
                    call: {
                        text: changeModeResult.message
                    }
                };
            };
            case "generateMusicWithLyrics": {
                if (
                    (
                        await context.services
                            .userApplication
                            .setUserMode(context.user.id, UserMode.UserPrompt.MusicWithLyricsAndTemplateGeneration)
                    ).ok
                ) {
                    await tgCall(
                        TelegramMethods.EditMessageText,
                        {
                            chat_id: update.callback_query?.message.chat.id,
                            message_id: update.callback_query?.message.message_id,
                            ...await getMusicWithLyricsGenerationPanel(context)
                        }
                    );
                    return { shouldContinue: false };
                }

                return null;
            };
            case "imageUpscale": {
                if (
                    (
                        await context.services
                            .userApplication
                            .setUserMode(context.user.id, UserMode.UserPrompt.ImageUpscale)
                    ).ok
                ) {
                    await tgCall(
                        TelegramMethods.EditMessageText,
                        {
                            chat_id: update.callback_query?.message.chat.id,
                            message_id: update.callback_query?.message.message_id,
                            ...await getImageUpscalePanel(context)
                        }
                    );
                    return { shouldContinue: false };
                }

                return null;
            };
            case "create3dModel": {
                if (
                    (
                        await context.services
                            .userApplication
                            .setUserMode(context.user.id, UserMode.UserPrompt.Create3dModel)
                    ).ok
                ) {
                    await tgCall(
                        TelegramMethods.EditMessageText,
                        {
                            chat_id: update.callback_query?.message.chat.id,
                            message_id: update.callback_query?.message.message_id,
                            ...await get3dModelGenerationPanel(context)
                        }
                    );
                    return { shouldContinue: false };
                }

                return null;
            };
            case "mySubscriptions": {
                const subscriptionsList = await getUserSubscriptionsList(context);

                if (!subscriptionsList)
                    return null;

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ...subscriptionsList
                    }
                );

                return { shouldContinue: false };
            };
            case "voiceResponsePanel":
                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ...await getVoiceResponsePanel(context)
                    }
                );
                return { shouldContinue: false };
            case "myInviteLink": {
                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        text: `${emojiIcon.gift} ${context.uiText.inviteFriends}\n\n${context.uiText.inviteDescriptionText}\n\n${context.uiText.yourInviteLink}:\n${startLinkGenerator(context, `i${context.user.tgId}`)}`,
                        link_preview_options: {
                            is_disabled: true,
                        },
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "panel" }]
                            ]
                        }
                    }
                );

                return { shouldContinue: false };
            };
            case "deleteMessage": {

                await tgCall(
                    TelegramMethods.DeleteMessage,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id
                    }
                );

                return { shouldContinue: false };
            };
            case "chats": {
                const _chatList = await getChatListPanel(context);

                if (!_chatList)
                    return null;

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ..._chatList
                    }
                );

                return { shouldContinue: false };
            };
            case "modelsUsage": {
                const modelUsageList = await getTextModelUsageListPanel(context);

                if (!modelUsageList)
                    return null;

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ...modelUsageList
                    }
                );

                return { shouldContinue: false };
            };
            case "changeMemoryAmount": {
                if (!context.user.saveMessages) {
                    await tgCall(
                        TelegramMethods.AnswerCallbackQuery,
                        {
                            callback_query_id: update.callback_query?.id,
                            text: context.uiText.activateSaveMessagesFirst,
                            show_alert: true,
                            cache_time: 1,
                        }
                    );
                    return { shouldContinue: false };
                }

                const newMemoryAmount = ({
                    [AIChatHistoryMemory.None]: AIChatHistoryMemory.Short,
                    [AIChatHistoryMemory.Short]: AIChatHistoryMemory.Normal,
                    [AIChatHistoryMemory.Normal]: AIChatHistoryMemory.Long,
                    [AIChatHistoryMemory.Long]: AIChatHistoryMemory.Short,
                })[context.user.memoryAmount];

                const res = await context.services.userApplication.setMemoryAmount(context.user.id, newMemoryAmount);

                if (!res.ok) {
                    await tgCall(
                        TelegramMethods.AnswerCallbackQuery,
                        {
                            callback_query_id: update.callback_query?.id,
                            text: context.getUit(res.message),
                            show_alert: true,
                            cache_time: 1,
                        }
                    );
                    return { shouldContinue: false };
                }

                context.user.memoryAmount = newMemoryAmount;

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
            case "activateSaveMessages":
            case "deactivateSaveMessages": {
                const saveMessages = queryData === "activateSaveMessages";
                const res = await context.services.userApplication.setSaveMessages(context.user.id, saveMessages);

                if (!res.ok)
                    return null;

                context.user.saveMessages = saveMessages;

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
            }
        }

        return null;
    }
}
