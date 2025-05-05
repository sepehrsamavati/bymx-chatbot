import tgCall from "../helpers/call.js";
import { config } from "bymx-core/server";
import emojiIcon from "../helpers/emojiIcon.js";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";
import { reduceTo2DArray, UIText, UserMode, UserStatus } from "bymx-core/shared";

export const preEulaCommandHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.TextMessage,

    async handler(context, update) {
        const text = update.message?.text as string;

        const isCommand = update.message?.entities?.at(0)?.type === "bot_command";

        let command = "";
        if (isCommand) {
            command = text;
            if (command.startsWith("/start")) {
                // const startParameter = command.replace("/start", "").trimStart();
                command = "/start"; // remove start parameters
            }
        }

        switch (command) {
            case "/start": {
                if (context.user.telegram?.mode !== UserMode.General.Normal)
                    await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);

                const languageItems = UIText.langCodes.map(langCode => ({ code: langCode, title: UIText.default[langCode]._language, }));

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
                                    [{ text: `🤖 ${context.uiText.panel}`, callback_data: "panel" }],
                                    ...reduceTo2DArray(languageItems)
                                        .map(rowLanguages => rowLanguages.map(language => ({ text: language.title, callback_data: `setLanguage_${language.code}` })))
                                ]
                            }
                        }
                    )
                ]);

                return { shouldContinue: context.user.status === UserStatus.EULA };
            }
            case "/help":
                if (context.user.telegram?.mode !== UserMode.General.Normal)
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
                                + `\n\n${emojiIcon.tools} ${context.uiText.tools}: /ai`
                                + `\n\n${emojiIcon.speaking} ${context.uiText.voiceSettings}: /voice`
                                + `\n\n${emojiIcon.model} ${context.uiText.modelsCost}: /models`
                                + `\n\n${emojiIcon.recycle} ${context.uiText.clearCurrentChatHistory}: /clear`
                                + `\n\n${emojiIcon.help} ${context.uiText.help}: /help`
                                + `\n\n${emojiIcon.globe} ${context.uiText.changeLanguage}: /language`
                        }
                    )
                ]);

                return { shouldContinue: false };
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
                        text: `${emojiIcon.contact} ${context.uiText.contactSupport}: ${config.telegram.supportAccountUsername}`
                    }
                };
            case "/language":
            case "/lang":
            case "/change_language": {
                const languageItems = UIText.langCodes.map(langCode => ({ code: langCode, title: UIText.default[langCode]._language, }));
                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        message_id: update.message?.message_id,
                        reply_parameters: {
                            allow_sending_without_reply: true,
                            message_id: update.message?.message_id
                        },
                        text: (
                            `${emojiIcon.globe} ${context.uiText.selectLanguage}`
                        ),
                        reply_markup: {
                            inline_keyboard: [
                                ...reduceTo2DArray(languageItems)
                                    .map(rowLanguages => rowLanguages.map(language => ({ text: language.title, callback_data: `setLanguage_${language.code}` })))
                            ]
                        }
                    }
                );
                return { shouldContinue: false };
            }
        }

        return { shouldContinue: true };
    }
}
