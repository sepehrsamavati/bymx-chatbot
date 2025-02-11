import tgCall from "../helpers/call.js";
import { config } from "bymx-core/server";
import emojiIcon from "../helpers/emojiIcon.js";
import type { IUpdateHandler } from "../types/telegram.js";
import { PaymentStatus, UserMode } from "bymx-core/shared";
import { paymentMessageCache } from "../modules/paymentMessageJob.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";
import { getPlanBuyPanel, getPlanInfoPanel, getPlanList, getStaticPaymentReceiptInfoKeyboard } from "../modules/messages.js";

export const planHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.All,
    mode: [
        UserMode.General.Normal,
        UserMode.General.StaticPayment,
    ],
    async handler(context, update) {
        if (update.message?.chat.type !== "private" && update.callback_query?.message.chat.type !== "private")
            return null;

        const queryData = update.callback_query?.data;

        if (context.user.mode === UserMode.General.StaticPayment) {

            if (queryData === "cancelPayment") {
                await Promise.all([
                    context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal),
                    paymentMessageCache.delete(context.user.id),
                ]);
                const cancel = await context.services.paymentApplication.cancel(context.user.id);
                return {
                    call: {
                        text: cancel.message
                    }
                };
            }

            const isValid = Boolean(update.message?.text || update.message?.photo || update.message?.document);

            if (!isValid || !update.message)
                return {
                    call: {
                        text: "sendReceiptTextOrScreenshot"
                    }
                };

            const submitErrorMessage = `${context.uiText.staticPaymentSubmitErrored}\n\n${emojiIcon.contact} ${context.uiText.support}: /support`;

            await Promise.all([
                context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal),
                paymentMessageCache.delete(context.user.id),
            ]);

            const savePaymentResult = await context.services.paymentApplication.approveByUser(context.user.id);
            if (!(savePaymentResult.ok && savePaymentResult.data))
                return {
                    call: {
                        text: submitErrorMessage
                    }
                };

            // update cache
            savePaymentResult.data.status = PaymentStatus.PendingApprove;

            const sendToReceiptChatResult = await tgCall(
                TelegramMethods.CopyMessage,
                {
                    chat_id: config.telegram.staticPaymentReceiptChatId,
                    from_chat_id: update.message.chat.id,
                    message_id: update.message.message_id,
                    ...getStaticPaymentReceiptInfoKeyboard({
                        botUsername: context.botUsername,
                        customer: context.user,
                        payment: savePaymentResult.data,
                    })
                }
            );

            if (sendToReceiptChatResult?.ok) {
                await tgCall(TelegramMethods.SendMessage, {
                    chat_id: update.message.chat.id,
                    text: `${emojiIcon.ok} ${context.uiText.staticPaymentSubmitted}`,
                    reply_parameters: {
                        allow_sending_without_reply: true,
                        message_id: update.message.message_id
                    }
                });
            } else {
                return {
                    call: {
                        text: submitErrorMessage
                    }
                };
            }

            return { shouldContinue: false };
        }

        if (queryData === "planList") {
            const planList = await getPlanList(context);

            if (!planList)
                return null;

            if (planList === "noPlanAvailable") {
                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: context.uiText.noItemToShow,
                        show_alert: true,
                        cache_time: 20,
                    }
                );
            } else {
                await tgCall(
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
                        ...planList
                    }
                );
            }

            return { shouldContinue: false };
        } else if (queryData?.startsWith("viewPlan_")) {
            if (context.user.mode !== UserMode.General.Normal) {
                await context.services.userApplication.setUserMode(context.user.id, UserMode.General.Normal);
                context.user.mode = UserMode.General.Normal;
            }

            const planId = queryData.replace("viewPlan_", "");
            const planInfoPanel = await getPlanInfoPanel(context, planId);

            if (!planInfoPanel)
                return null;

            await tgCall(
                TelegramMethods.EditMessageText,
                {
                    chat_id: update.callback_query?.message.chat.id,
                    message_id: update.callback_query?.message.message_id,
                    ...planInfoPanel
                }
            );

            return { shouldContinue: false };
        } else if (queryData?.startsWith("buyPlan_")) {
            const planId = queryData.replace("buyPlan_", "");
            const currentSubscriptionsInfo = await context.services.userSubscriptionApplication.getActiveSubscriptionsExtendedInfo(context.user.id);

            if (!currentSubscriptionsInfo)
                return null;

            if (currentSubscriptionsInfo.paidSubscriptions.length >= config.activeSubscriptionLimit) {
                await tgCall(
                    TelegramMethods.AnswerCallbackQuery,
                    {
                        callback_query_id: update.callback_query?.id,
                        text: context.uiText.maxActiveSubscriptionsReached,
                        show_alert: true,
                        cache_time: 20,
                    }
                );
                return { shouldContinue: false };
            }

            const planBuyPanel = await getPlanBuyPanel(context, planId);

            if (!planBuyPanel)
                return null;

            const createdPayment = await context.services.paymentApplication.open(context.user.id, planId);

            if (!createdPayment.ok)
                return {
                    call: {
                        text: createdPayment.message
                    }
                };
            else {
                const userModeChangeResult = await context.services.userApplication.setUserMode(context.user.id, UserMode.General.StaticPayment);

                if (!userModeChangeResult.ok)
                    return {
                        call: {
                            text: userModeChangeResult.message
                        }
                    };

                const res = await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        ...planBuyPanel
                    }
                );

                if (res?.ok) {
                    paymentMessageCache.set(context.user.id, {
                        date: new Date(),
                        chatId: res.result.chat.id,
                        messageId: res.result.message_id,
                    });
                }
            }

            return { shouldContinue: false };
        }

        return null;
    }
}
