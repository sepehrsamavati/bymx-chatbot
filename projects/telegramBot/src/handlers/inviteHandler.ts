import tgCall from "../helpers/call.js";
import { UserMode } from "bymx-core/shared";
import emojiIcon from "../helpers/emojiIcon.js";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";

export const inviteHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.All,
    mode: UserMode.General.Normal,
    async handler(context) {

        if (context.user.telegram?.invite?.used === false) {
            const useInviteRes = await context.services.userApplication.useInvite(context.user);
            if (useInviteRes.ok && useInviteRes.data && useInviteRes.data.inviter.telegram)
                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: useInviteRes.data.inviter.telegram.id,
                        text: `${emojiIcon.ok} ${context.uiText.userJoinedWithYourInviteLink}`
                    }
                );
        }

        return null;
    }
}
