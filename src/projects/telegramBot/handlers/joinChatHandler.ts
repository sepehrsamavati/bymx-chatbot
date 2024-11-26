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

        for (const chat of []) {
            const res = await tgCall(
                TelegramMethods.GetChatMember,
                {
                    chat_id: 0,
                    user_id: context.user.tgId
                }
            );
            if (res?.ok) {
                if (["member", "administrator", "creator"].includes(res.result.status)) {
                    // ok
                } else {
                    // not a member
                }
            } else {
                // not admin or no access to target chat/channel
            }
        }

        return { shouldContinue: false };
    }
}
