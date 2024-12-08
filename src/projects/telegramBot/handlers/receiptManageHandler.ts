import tgCall from "../helpers/call.js";
import { UserMode } from "../../../types/enums/userMode.js";
import { UserType } from "../../../types/enums/userTypes.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { accessHelper } from "../../core/helpers/accessHelper.js";
import { getStaticPaymentReceiptPanel } from "../helpers/messages.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const receiptManageHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: [
        TelegramUpdateType.CallbackQuery,
        TelegramUpdateType.TextMessage,
    ],
    mode: [
        UserMode.General.Normal,
        UserMode.Manager.SetStaticPaymentGatewayId,
    ],
    async handler(context, update) {
        if (!accessHelper(UserType.Manager, context.user.type))
            return null;

        const text = update.message?.text;
        const queryData = update.callback_query?.data;

        if (queryData?.startsWith("approveStaticPayment_")) {
            const paymentId = queryData.replace("approveStaticPayment_", "");
            const result = await context.services.paymentApplication.approveById(paymentId);

            const callbackQueryAnswer = await tgCall(
                TelegramMethods.AnswerCallbackQuery,
                {
                    callback_query_id: update.callback_query?.id,
                    text: context.getUit(result.message),
                    show_alert: false,
                    cache_time: 10,
                }
            );

            if (callbackQueryAnswer?.ok) {
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
            }
            return { shouldContinue: false };
        } else if (queryData?.startsWith("rejectStaticPayment_")) {
            const paymentId = queryData.replace("rejectStaticPayment_", "");
            const result = await context.services.paymentApplication.rejectById(paymentId);

            const callbackQueryAnswer = await tgCall(
                TelegramMethods.AnswerCallbackQuery,
                {
                    callback_query_id: update.callback_query?.id,
                    text: context.getUit(result.message),
                    show_alert: false,
                    cache_time: 10,
                }
            );

            if (callbackQueryAnswer?.ok) {
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
            }
            return { shouldContinue: false };
        } else if (queryData?.startsWith("setStaticPaymentId_")) {
            const paymentId = queryData.replace("setStaticPaymentId_", "");

            if (!paymentId)
                return null;

            await context.services.userApplication.setUserMode(context.user.id, UserMode.Manager.SetStaticPaymentGatewayId);
            context.services.selectedStaticPaymentIdCacheStorage.set(context.user.id, paymentId);

            return {
                call: {
                    text: `${context.uiText.sendGatewayPaymentId}\n\n${context.uiText.cancel}: /cancel`
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