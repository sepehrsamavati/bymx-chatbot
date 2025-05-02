import tgCall from "../helpers/call.js";
import emojiIcon from "../helpers/emojiIcon.js";
import { accessHelper, UserType } from "bymx-core/shared";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";

export const joinChatHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.All,
    chatTypes: ["all"],
    async handler(context, update) {

        if (
            (
                update.my_chat_member?.new_chat_member.user.id === context.botId // the bot
                && (update.my_chat_member.new_chat_member.status === "administrator" || update.my_chat_member.new_chat_member.status === "member") // is added
                && update.my_chat_member.chat.type !== "private" // to a group or channel
            )
        ) {
            const inviterUser = await context.services.userApplication.getUserByTgId(update.my_chat_member.from.id);

            if (inviterUser && inviterUser.telegram && accessHelper(UserType.Manager, inviterUser.type)) {
                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: inviterUser.telegram.id,
                        text: `${emojiIcon.info} Bot added to chat '${update.my_chat_member.chat.title}'\n${emojiIcon.identifier}: ${update.my_chat_member.chat.id}`
                    }
                );
            } else {
                await tgCall(
                    TelegramMethods.LeaveChat,
                    { chat_id: update.my_chat_member.chat.id }
                );
            }

            return { shouldContinue: false };
        }

        return null;
    }
}
