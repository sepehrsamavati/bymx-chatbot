import tgCall from "../helpers/call.js";
import emojiIcon from "../helpers/emojiIcon.js";
import { UserMode } from "../../../types/enums/userMode.js";
import { UserType } from "../../../types/enums/userTypes.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { accessHelper } from "../../core/helpers/accessHelper.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { getPanel, getModelUsageListPanel } from "../helpers/messages.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const adminCommandHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.TextMessage,

    async handler(context, update) {
        if (!accessHelper(UserType.Admin, context.user.type))
            return { shouldContinue: true };

        const text = update.message?.text as string;

        const isCommand = update.message?.entities?.at(0)?.type === "bot_command" && !text.includes('\n');

        if (!isCommand)
            return { shouldContinue: true };

        if (text.startsWith("/find@")) {
            const targetUsername = text.replace("/find@", "");

            const info = await context.services.userApplication.getUserInfo(targetUsername);

            return {
                call: {
                    text: info ? (
                        `${emojiIcon.identifier} ${info.user.tgId}`
                        + `\n\n${info.activePlans}`
                        + `\n${emojiIcon.free} ${info.remainingDailyFreePoints}`
                    ) : context.uiText.userNotFound
                }
            };
        } else if (text.startsWith("/find_")) {
            const tgId = Number.parseInt(text.replace("/find_", ""));

            const info = await context.services.userApplication.getUserInfo(tgId);

            return {
                call: {
                    text: info ? (
                        `${emojiIcon.identifier} ${info.user.tgId}`
                        + `\n\n${info.activePlans}`
                        + `\n${emojiIcon.free} ${info.remainingDailyFreePoints}`
                    ) : context.uiText.userNotFound
                }
            };
        }

        return { shouldContinue: false };
    }
}
