import tgCall from "../helpers/call.js";
import emojiIcon from "../helpers/emojiIcon.js";
import { logger } from "../../core/helpers/logger.js";
import { UserMode } from "../../../types/enums/userMode.js";
import { UserType } from "../../../types/enums/userTypes.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { accessHelper } from "../../core/helpers/accessHelper.js";
import { getStaticPaymentReceiptInfoKeyboard, getStaticPaymentReceiptPanel } from "../helpers/messages.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";
import config from "../../core/config.js";

export const receiptManageHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: [
        TelegramUpdateType.CallbackQuery,
        TelegramUpdateType.TextMessage,
    ],
    mode: [
        UserMode.General.Normal,
        UserMode.Manager.SetStaticPaymentGatewayId,
        UserMode.Manager.SetStaticPaymentRejectReason,
    ],
    chatTypes: ["all"],
    async handler(context, update) {
        if (!accessHelper(UserType.Manager, context.user.type))
            return null;

        const text = update.message?.text;
        const queryData = update.callback_query?.data;

        if (context.chat?.type !== "private") {

            if (update.callback_query?.message.chat.id?.toString() === config.staticPaymentReceiptTgChatId) {
                if (queryData?.startsWith("refreshReceipt_")) {
                    const paymentId = queryData.replace("refreshReceipt_", "");

                    const payment = await context.services.paymentApplication.getById(paymentId);
                    if (!payment)
                        return null;

                    const customer = await context.services.userApplication.getUserById(payment.userId);
                    if (!customer)
                        return null;

                    await tgCall(
                        TelegramMethods.EditMessageReplyMarkup,
                        {
                            chat_id: update.callback_query.message.chat.id,
                            ...getStaticPaymentReceiptInfoKeyboard({
                                botUsername: context.botUsername,
                                customer: customer,
                                payment: payment,
                            })
                        }
                    );
                }
            }

            return null;
        }

        if (queryData?.startsWith("approveStaticPayment_")) {
            const paymentId = queryData.replace("approveStaticPayment_", "");
            const payment = await context.services.paymentApplication.getById(paymentId);

            if (!payment)
                return {
                    call: {
                        text: "itemNotFound"
                    }
                };

            const approvePayment = await context.services.paymentApplication.approveById(paymentId);

            await tgCall(
                TelegramMethods.AnswerCallbackQuery,
                {
                    callback_query_id: update.callback_query?.id,
                    text: context.getUit(approvePayment.message),
                    show_alert: !approvePayment.ok,
                    cache_time: 2,
                }
            );

            if (approvePayment.ok) {
                const purchase = await context.services.userSubscriptionApplication.purchasePlan(payment.userId, payment.productId);

                if (!purchase.ok) {
                    const rollbackStatus = await context.services.paymentApplication.unsetValidityStatus(paymentId);

                    if (!rollbackStatus.ok)
                        logger.error(`Couldn't rollback approve payment '${paymentId}': ${rollbackStatus.message}`);

                    return {
                        shouldContinue: false,
                        call: {
                            text: `${emojiIcon.failed}`
                                + `\nApprove rollback: ${rollbackStatus.ok} ${context.getUit(rollbackStatus.message)}`
                                + `\nPurchase: ${context.getUit(purchase.message)}`
                        }
                    };
                }

                const receiptPanel = await getStaticPaymentReceiptPanel(context, paymentId);
                if (receiptPanel && typeof receiptPanel === "object")
                    await tgCall(
                        TelegramMethods.EditMessageText,
                        {
                            chat_id: update.callback_query?.message.chat.id,
                            message_id: update.callback_query?.message.message_id,
                            ...receiptPanel
                        }
                    );

                const user = await context.services.userApplication.getUserById(payment.userId);
                if (user)
                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: user.tgId,
                            text: `${emojiIcon.ok} ${context.uiText.paymentApproved}`,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: `🤖 ${context.uiText.panel}`, callback_data: "panel" }]
                                ]
                            }
                        }
                    );
            }

            return { shouldContinue: false };
        } else if (queryData?.startsWith("rejectStaticPayment_")) {
            const paymentId = queryData.replace("rejectStaticPayment_", "");

            await context.services.userApplication.setUserMode(context.user.id, UserMode.Manager.SetStaticPaymentRejectReason);
            context.services.selectedStaticPaymentIdCacheStorage.set(context.user.id, paymentId);

            return {
                call: {
                    text: `${context.uiText.sendRejectReason}:\n\n${context.uiText.cancel}: /cancel`
                }
            };
        } else if (context.user.mode === UserMode.Manager.SetStaticPaymentRejectReason && text && text.length < 3e3) {

            const selectedPaymentId = context.services.selectedStaticPaymentIdCacheStorage.get(context.user.id);

            await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);
            context.services.selectedStaticPaymentIdCacheStorage.unset(context.user.id);

            if (!selectedPaymentId)
                return {
                    call: {
                        text: "errorOccurred"
                    }
                };
            else {
                const payment = await context.services.paymentApplication.getById(selectedPaymentId);

                if (!payment)
                    return {
                        call: {
                            text: "itemNotFound"
                        }
                    };

                const result = await context.services.paymentApplication.rejectById(selectedPaymentId, text);

                let sentToUser = false;

                if (result.ok) {
                    const user = await context.services.userApplication.getUserById(payment.userId);
                    if (user) {
                        const sendToUser = await tgCall(
                            TelegramMethods.SendMessage,
                            {
                                chat_id: user.tgId,
                                text: `${emojiIcon.failed} ${context.uiText.paymentRejected}\n\n${context.uiText.reason}: ${text}`,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: `🤖 ${context.uiText.panel}`, callback_data: "panel" }]
                                    ]
                                }
                            }
                        );
                        sentToUser = sendToUser?.ok ?? false;
                    }
                }

                return {
                    call: {
                        text: `${context.getUit(result.message)}\n\n${context.uiText.notifyUser}: ${sentToUser ? emojiIcon.ok : emojiIcon.failed}`
                    }
                };
            }
        } else if (queryData?.startsWith("setStaticPaymentId_")) {
            const paymentId = queryData.replace("setStaticPaymentId_", "");

            if (!paymentId)
                return null;

            await context.services.userApplication.setUserMode(context.user.id, UserMode.Manager.SetStaticPaymentGatewayId);
            context.services.selectedStaticPaymentIdCacheStorage.set(context.user.id, paymentId);

            return {
                call: {
                    text: `${context.uiText.sendGatewayPaymentId}:\n\n${context.uiText.cancel}: /cancel`
                }
            };
        } else if (context.user.mode === UserMode.Manager.SetStaticPaymentGatewayId && text) {
            const selectedPaymentId = context.services.selectedStaticPaymentIdCacheStorage.get(context.user.id);

            await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);
            context.services.selectedStaticPaymentIdCacheStorage.unset(context.user.id);

            if (!selectedPaymentId)
                return {
                    call: {
                        text: "errorOccurred"
                    }
                };
            else {
                const res = await context.services.paymentApplication.setGatewayPaymentId(selectedPaymentId, text);
                return {
                    call: {
                        text: res.message
                    }
                };
            }
        }

        return null;
    }
};