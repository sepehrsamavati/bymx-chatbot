import tgCall from "../helpers/call.js";
import config from "../../core/config.js";
import emojiIcon from "../helpers/emojiIcon.js";
import { UserMode } from "../../../types/enums/userMode.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";
import { getPlanBuyPanel, getPlanInfoPanel, getPlanList } from "../helpers/messages.js";
import startLinkGenerator from "../helpers/startLinkGenerator.js";
import { paymentMessageCache } from "../modules/paymentMessageJob.js";

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

        if (context.user.mode === UserMode.General.StaticPayment && !queryData?.startsWith("viewPlan_")) {
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
            if (!savePaymentResult.ok)
                return {
                    call: {
                        text: submitErrorMessage
                    }
                };

            const sendToReceiptChatResult = await tgCall(
                TelegramMethods.CopyMessage,
                {
                    chat_id: config.staticPaymentReceiptTgChatId,
                    from_chat_id: update.message.chat.id,
                    message_id: update.message.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: `${emojiIcon.identifier} ${context.user.tgId}`, url: startLinkGenerator(context, "getUser_" + context.user.tgId) }],
                            [{ text: `${emojiIcon.info} View`, url: startLinkGenerator(context, "getReceipt_" + savePaymentResult.data?.id) }],
                        ]
                    }
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
                if (context.user.mode === UserMode.General.StaticPayment) {
                    paymentMessageCache.unset(context.user.id);
                    await context.services.paymentApplication.cancel(context.user.id);
                }
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

            await paymentMessageCache.delete(context.user.id);

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
                    TelegramMethods.EditMessageText,
                    {
                        chat_id: update.callback_query?.message.chat.id,
                        message_id: update.callback_query?.message.message_id,
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
