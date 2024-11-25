import tgCall from "../helpers/call.js";
import emojiIcon from "../helpers/emojiIcon.js";
import { UserMode } from "../../../types/enums/userMode.js";
import { UserType } from "../../../types/enums/userTypes.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { accessHelper } from "../../core/helpers/accessHelper.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { getPanel, getModelUsageListPanel, getUserManagementText } from "../helpers/messages.js";
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
            return {
                shouldContinue: false,
                call: {
                    text: getUserManagementText(context, await context.services.userApplication.getUserInfo(targetUsername))
                }
            };
        } else if (text.startsWith("/find_")) {
            const tgId = Number.parseInt(text.replace("/find_", ""));
            return {
                shouldContinue: false,
                call: {
                    text: getUserManagementText(context, await context.services.userApplication.getUserInfo(tgId))
                }
            };
        } else if (text.startsWith("/ban")) {
            if (!accessHelper(UserType.Manager, context.user.type))
                return {
                    shouldContinue: false,
                    call: {
                        text: "noAccessToBlock"
                    }
                };

            const tgId = Number.parseInt(text.replace("/ban", ""));
            const targetUser = await context.services.userApplication.getUserByTgId(tgId);

            if (!targetUser)
                return {
                    shouldContinue: false,
                    call: {
                        text: context.uiText.userNotFound
                    }
                };

            if (targetUser.status === UserStatus.Banned)
                return {
                    shouldContinue: false,
                    call: {
                        text: "userAlreadyBanned"
                    }
                };

            if (accessHelper(UserType.Owner, targetUser.type))
                return {
                    shouldContinue: false,
                    call: {
                        text: "cantModifyOwner"
                    }
                };

            if (context.user.id === targetUser.id)
                return {
                    shouldContinue: false,
                    call: {
                        text: "cantBanYourself"
                    }
                };

            const res = await context.services.userApplication.setUserStatus(targetUser.id, UserStatus.Banned);

            return {
                shouldContinue: false,
                call: {
                    text: res.ok ? emojiIcon.ok : emojiIcon.failed
                }
            };
        } else if (text.startsWith("/unban")) {
            if (!accessHelper(UserType.Manager, context.user.type))
                return {
                    shouldContinue: false,
                    call: {
                        text: "noAccessToBan"
                    }
                };

            const tgId = Number.parseInt(text.replace("/unban", ""));
            const targetUser = await context.services.userApplication.getUserByTgId(tgId);

            if (!targetUser)
                return {
                    shouldContinue: false,
                    call: {
                        text: context.uiText.userNotFound
                    }
                };

            if (targetUser.status !== UserStatus.Banned)
                return {
                    shouldContinue: false,
                    call: {
                        text: "userIsNotBanned"
                    }
                };

            if (accessHelper(UserType.Owner, targetUser.type))
                return {
                    shouldContinue: false,
                    call: {
                        text: "cantModifyOwner"
                    }
                };

            const res = await context.services.userApplication.setUserStatus(targetUser.id, UserStatus.EULA);

            return {
                shouldContinue: false,
                call: {
                    text: res.ok ? emojiIcon.ok : emojiIcon.failed
                }
            };
        } else if (update.message?.reply_to_message && update.message.reply_to_message.chat.id === context.user.tgId
            && ["/bc", "/fbc"].includes(text)
        ) {
            const res = await context.services.telegramBroadcastApplication.addToQueue(context.user, update.message.reply_to_message.message_id, text === "/fbc");

            if (res.ok) {
                context.broadcastTrigger();
            }

            return {
                call: {
                    text: res.message
                },
            };
        }

        return { shouldContinue: true };
    }
}
