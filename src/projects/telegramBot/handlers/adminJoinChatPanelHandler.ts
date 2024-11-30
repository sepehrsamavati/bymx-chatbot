import tgCall from "../helpers/call.js";
import emojiIcon from "../helpers/emojiIcon.js";
import { UserMode } from "../../../types/enums/userMode.js";
import { UserType } from "../../../types/enums/userTypes.js";
import type { IUpdateHandler, MessageOriginChannel, MessageOriginChat } from "../../../types/telegram.js";
import { accessHelper } from "../../core/helpers/accessHelper.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";
import { getAdminPanel, getJoinRequiredChatPanel, getJoinRequiredChatsPanel } from "../helpers/messages.js";

export const adminJoinChatPanelHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: [
        TelegramUpdateType.CallbackQuery,
        TelegramUpdateType.Message,
    ],
    mode: [
        UserMode.General.Normal,
        UserMode.JoinRequiredChatManagement.AddNew
    ],

    async handler(context, update) {
        if (!accessHelper(UserType.Admin, context.user.type))
            return { shouldContinue: true };

        const queryData = update.callback_query?.data;

        switch (queryData) {
            case "joinRequiredChatsPanel": {
                if (context.user.mode !== UserMode.General.Normal)
                    await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);

                const _joinRequiredChatsPanel = await getJoinRequiredChatsPanel(context);

                if (!_joinRequiredChatsPanel)
                    return null;

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ..._joinRequiredChatsPanel
                    }
                );

                return { shouldContinue: false };
            };
            case "newJoinRequiredChat": {
                await context.services.userApplication.setUserMode(context.user.id, UserMode.JoinRequiredChatManagement.AddNew);

                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        text: context.uiText.forwardMessageFromChannel,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `${emojiIcon.failed} ${context.uiText.cancel}`, callback_data: "joinRequiredChatsPanel" }]
                            ]
                        }
                    }
                );

                return { shouldContinue: false };
            };
        }

        if (queryData?.startsWith("manageJoinChat_")) {
            const id = queryData.replace("manageJoinChat_", "");
            const _joinRequiredChatPanel = await getJoinRequiredChatPanel(context, id);

            if (!_joinRequiredChatPanel)
                return null;

            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id,
                    ..._joinRequiredChatPanel
                }
            );

            return { shouldContinue: false };
        } else if (context.user.mode === UserMode.JoinRequiredChatManagement.AddNew) {
            if (update.message?.forward_origin?.type === "channel" || update.message?.forward_origin?.type === "chat") {
                const chat = (update.message.forward_origin as MessageOriginChat).sender_chat ?? (update.message.forward_origin as MessageOriginChannel).chat;

                if (!chat?.username)
                    return null;

                const chatId = chat.id;
                const title = chat.title ?? "";

                const res = await context.services.telegramJoinRequiredChatApplication.add({
                    title, chatId,
                    link: `https://t.me/${chat.username}`
                });

                if (!res.ok)
                    return {
                        call: {
                            text: res.message
                        }
                    };

                await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);

                const _joinRequiredChatsPanel = await getJoinRequiredChatsPanel(context);

                if (!_joinRequiredChatsPanel)
                    return null;

                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message.chat.id,
                        ..._joinRequiredChatsPanel
                    }
                );

                return { shouldContinue: false };
            }
        }

        return { shouldContinue: true };
    }
}
