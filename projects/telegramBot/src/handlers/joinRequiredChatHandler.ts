import tgCall from "../helpers/call.js";
import { accessHelper, UserType } from "bymx-core/shared";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { getJoinChatsPanel, getPanel } from "../modules/messages.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";

export const joinRequiredChatHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.All,

    async handler(context, update) {
        if (!update.callback_query?.message)
            return null;

        if (update.inline_query || (update.message || update.callback_query?.message)?.chat.type !== "private")
            return null;

        if (accessHelper(UserType.Admin, context.user.type))
            return null;

        const chats = await context.services.telegramJoinRequiredChatApplication.getActives();
        const joinedChats: Array<string> = [];
        const isCheckJoin = update.callback_query?.data === "checkJoinRequiredChats";

        for (const chat of chats) {
            const chatId = chat.chatId;
            const userId = context.user.tgId;
            const chatMemberTempId = `u${userId}_c${chatId}`;

            if (context.services.chatMemberCacheStorage.exists(chatMemberTempId)) {
                joinedChats.push(chat.id);
                continue;
            }

            const res = await tgCall(
                TelegramMethods.GetChatMember,
                {
                    chat_id: chatId,
                    user_id: userId
                }
            );

            if (res?.ok) {
                if (["member", "administrator", "creator"].includes(res.result.status)) { // is member
                    joinedChats.push(chat.id);
                    context.services.chatMemberCacheStorage.set(chatMemberTempId, new Date());
                } else { // is not member
                    if (update.callback_query && isCheckJoin)
                        await tgCall(
                            TelegramMethods.EditMessageText,
                            {
                                chat_id: userId,
                                message_id: update.callback_query.message.message_id,
                                ...await getJoinChatsPanel(context, joinedChats, true)
                            }
                        );
                    else
                        await tgCall(
                            TelegramMethods.SendMessage,
                            {
                                chat_id: userId,
                                ...await getJoinChatsPanel(context, joinedChats)
                            }
                        );

                    return { shouldContinue: false };
                }
            } else { // not admin or no access to target chat/channel
                if (res?.error_code === 400 && res.description?.includes("member list is inaccessible")) {
                    // not admin
                } else {
                    // there is an error
                }
            }
        }

        if (isCheckJoin) {
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

        return { shouldContinue: true };
    }
}
