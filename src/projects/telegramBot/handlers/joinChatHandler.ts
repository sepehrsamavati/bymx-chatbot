import tgCall from "../helpers/call.js";
import emojiIcon from "../helpers/emojiIcon.js";
import { UserMode } from "../../../types/enums/userMode.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { getPanel, getModelUsageListPanel } from "../helpers/messages.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const joinChatHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.TextMessage,

    async handler(context, update) {
        if (update.message?.chat.type !== "private")
            return null;

        const chats = await context.services.telegramJoinRequiredChatApplication.getActives();

        for (const chat of chats) {
            const res = await tgCall(
                TelegramMethods.GetChatMember,
                {
                    chat_id: chat.chatId,
                    user_id: context.user.tgId
                }
            );

            if (res?.ok) {
                if (["member", "administrator", "creator"].includes(res.result.status)) {
                    // ok
                } else {
                    // not a member
                }
            } else { // not admin or no access to target chat/channel
                if (res?.error_code === 400 && res.description?.includes("member list is inaccessible")) {
                    // not admin
                } else {
                    // there is an error
                }
            }
        }

        return { shouldContinue: true };
    }
}
