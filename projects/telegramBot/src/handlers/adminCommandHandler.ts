import tgCall from "../helpers/call.js";
import emojiIcon from "../helpers/emojiIcon.js";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { UserType, UserStatus, accessHelper } from "bymx-core/shared";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";
import { getStaticPaymentReceiptPanel, getUserManagementText } from "../modules/messages.js";

export const adminCommandHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.TextMessage,

    async handler(context, update) {
        if (!accessHelper(UserType.Admin, context.user.type))
            return { shouldContinue: true };

        const startParameter = update.message?.text?.replace("/start", "").trimStart() ?? "";

        if (update.message && startParameter.startsWith("getUser_")) {
            const targetTgId = Number.parseInt(startParameter.replace("getUser_", ""));
            if (!Number.isNaN(targetTgId)) {
                update.message.text = `/find_${targetTgId}`;
            }
        } else if (update.message && startParameter.startsWith("getReceipt_")) {
            const receiptId = startParameter.replace("getReceipt_", "");
            if (receiptId.length)
                update.message.text = `/receipt_${receiptId}`;
        }

        const text = update.message?.text as string;

        let isCommand = update.message?.entities?.at(0)?.type === "bot_command" && !text.includes('\n');

        if (!isCommand)
            return { shouldContinue: true };

        if (text.startsWith("/find@")) {
            const targetUsername = text.replace("/find@", "");
            return {
                shouldContinue: false,
                call: {
                    text: getUserManagementText(context, await context.services.userApplication.getUserInfo({ username: targetUsername }))
                }
            };
        } else if (text.startsWith("/find_")) {
            const tgId = Number.parseInt(text.replace("/find_", ""));
            return {
                shouldContinue: false,
                call: {
                    text: getUserManagementText(context, await context.services.userApplication.getUserInfo({ tgId: tgId }))
                }
            };
        } else if (text.startsWith("/receipt_")) {
            const paymentId = text.replace("/receipt_", "");
            const receiptPanel = await getStaticPaymentReceiptPanel(context, paymentId);

            if (typeof receiptPanel === "string")
                return {
                    call: {
                        text: receiptPanel
                    }
                };

            await tgCall(
                TelegramMethods.SendMessage,
                {
                    chat_id: update.message?.chat.id,
                    ...receiptPanel
                }
            );

            return { shouldContinue: false };
        } else if (text.startsWith("/ban")) {
            if (!accessHelper(UserType.Manager, context.user.type))
                return {
                    shouldContinue: false,
                    call: {
                        text: "noAccessToBan"
                    }
                };

            const tgId = Number.parseInt(text.replace("/ban", ""));
            const targetUser = await context.services.userApplication.getUserByTgId(tgId);

            if (!targetUser)
                return {
                    shouldContinue: false,
                    call: {
                        text: "userNotFound"
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
                        text: "userNotFound"
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
        } else if (update.message?.reply_to_message && update.message.reply_to_message.chat.id === context.user.tgId
            && (text.startsWith("/send_") || text.startsWith("/forward_"))
        ) {
            const isCopy = text.startsWith("/send_");
            const tgId = text.replace(/\/send_|\/forward_/, "");
            const res = await tgCall(
                isCopy ? TelegramMethods.CopyMessage : TelegramMethods.ForwardMessage,
                {
                    chat_id: tgId,
                    from_chat_id: update.message.chat.id,
                    message_id: update.message.reply_to_message.message_id
                }
            );

            if (res?.ok) {
                return {
                    call: {
                        text: emojiIcon.ok
                    }
                };
            }

            return {
                call: {
                    text: (
                        `${emojiIcon.failed} ${res?.error_code}\n${res?.description ?? '-'}`
                    )
                },
            };
        } else if (text === "/refresh_models") {
            const res = await context.services.aiModelApplication.renewCache();
            return {
                call: {
                    text: res.ok ? emojiIcon.ok : emojiIcon.failed
                }
            };
        }

        return { shouldContinue: true };
    }
}
