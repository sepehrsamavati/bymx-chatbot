import tgCall from "../helpers/call.js";
import { UserStatus } from "bymx-core/shared";
import emojiIcon from "../helpers/emojiIcon.js";
import { setTimeout } from 'node:timers/promises';
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { getGivePhoneNumberPanel, getPanel } from "../modules/messages.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";

export const termsOfServiceHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: [
        TelegramUpdateType.Message,
        TelegramUpdateType.CallbackQuery
    ],

    async handler(context, update) {
        const queryData = update.callback_query?.message && update.callback_query?.data;

        if (queryData === "acceptTos") {

            await context.services.userApplication.setUserStatus(context.user.id, UserStatus.PhoneNumber);

            // auto approve if phone number exists
            if (context.user.phoneNumber /* && isContactSupported(context.user.phoneNumber) */) {
                // update database
                const userUpdateResult = await context.services.userApplication.setUserStatus(context.user.id, UserStatus.OK);

                if (!userUpdateResult.ok)
                    return {
                        call: {
                            text: userUpdateResult.message
                        }
                    };

                // update memory
                context.user.status = UserStatus.OK;

                await tgCall(
                    TelegramMethods.DeleteMessage,
                    {
                        chat_id: update.callback_query?.message?.chat.id,
                        message_id: update.callback_query?.message?.message_id
                    }
                );

                const _panel = await getPanel(context);
                if (!_panel)
                    return null;

                tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.callback_query?.message?.chat.id,
                        ..._panel,
                    }
                )

                return { shouldContinue: true };
            } else {
                await Promise.allSettled([
                    tgCall(
                        TelegramMethods.DeleteMessage,
                        {
                            chat_id: update.callback_query?.message?.chat.id,
                            message_id: update.callback_query?.message?.message_id
                        }
                    ),
                    tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.callback_query?.message?.chat.id,
                            ...getGivePhoneNumberPanel(context)
                        }
                    )
                ]);
            }

            return { shouldContinue: false };
        } else if (update.message?.contact && context.user.status === UserStatus.PhoneNumber) {
            const message = update.message;
            if (message.contact) {
                const contactIsValid = !message.forward_origin && message.contact.user_id === message.from.id;
                if (!contactIsValid)
                    return {
                        call: {
                            text: `❌ ${context.uiText.phoneNumberNotValid}`
                        }
                    };

                // const contactIsSupported = isContactSupported(message.contact.phone_number);
                // if (!contactIsSupported)
                //     return {
                //         call: {
                //             text: `❌ ${stringHelper.formatter(context.uiText.phoneNumberNotSupported, context.uiText.iranianAccounts)}`
                //         }
                //     };

                const _panel = await getPanel(context);

                if (!_panel)
                    return null;

                const userUpdateResult = await context.services.userApplication.setUserPhoneNumber(context.user.id, message.contact.phone_number, true);

                if (!userUpdateResult.ok)
                    return {
                        call: {
                            text: userUpdateResult.message
                        }
                    };

                // update memory
                context.user.status = UserStatus.OK;

                await Promise.allSettled([
                    (message.reply_to_message ? tgCall(
                        TelegramMethods.DeleteMessage,
                        {
                            chat_id: message.chat.id,
                            message_id: message.reply_to_message.message_id
                        }
                    ) : undefined),
                    tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: message.chat.id,
                            ..._panel,
                            reply_markup: {
                                ..._panel.reply_markup,
                                remove_keyboard: true
                            }
                        }
                    )
                ]);

                const useInviteRes = await context.services.userApplication.useInvite(context.user);
                if (useInviteRes.ok && useInviteRes.data)
                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: useInviteRes.data.inviter.tgId,
                            text: `${emojiIcon.ok} ${context.uiText.userJoinedWithYourInviteLink}`
                        }
                    );
            }

            return { shouldContinue: false };
        }

        switch (context.user.status) {
            case UserStatus.EULA: {

                const message = update.message ?? update.callback_query?.message;

                await setTimeout(500);

                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: message?.chat.id,
                        reply_to_message_id: message?.message_id,
                        text: context.uiText.shouldAcceptTermsOfService
                            + `\n\n${context.uiText._termsOfService}`,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `✅ ${context.uiText.acceptTos}`, callback_data: "acceptTos" }],
                            ]
                        }
                    }
                );

                return { shouldContinue: false };
            }
            case UserStatus.PhoneNumber: {

                const message = update.message ?? update.callback_query?.message;

                await setTimeout(500);

                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: message?.chat.id,
                        reply_to_message_id: message?.message_id,
                        ...getGivePhoneNumberPanel(context)
                    }
                );

                return { shouldContinue: false };
            }
        }

        return null;
    }
}
