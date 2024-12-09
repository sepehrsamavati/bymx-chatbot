import config from "../../core/config.js";
import startLinkGenerator from "./startLinkGenerator.js";
import { UserType } from "../../../types/enums/userTypes.js";
import emojiIcon, { paymentStatusIcon } from "./emojiIcon.js";
import { UITextOptionalKey } from "../../core/i18n/UIText.js";
import stringHelper from "../../core/helpers/stringHelper.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import type { RequestContext } from "../../../types/telegram.js";
import { accessHelper } from "../../core/helpers/accessHelper.js";
import type { OpenAIModel } from "../../../types/entities/openAIModel.js";
import type { User, UserInfoModel } from "../../../types/entities/user.js";
import type { Payment } from "../../staticPayment/types/entities/payment.js";
import { PaymentStatus } from "../../staticPayment/types/enums/paymentStatus.js";
import { modelUsageCalculator } from "../../core/helpers/openAICostCalculator.js";

export const getChatPanel = async (context: RequestContext, chatId: string) => {
    const chat = await context.services.openAIChatApplication.getUserChatById(context.user.id, chatId);

    if (!chat)
        return null;

    return {
        text: `ℹ ${context.uiText.title}: ${chat.title || context.uiText.noTitle}`
            + `\n\n🤖 ${context.uiText.model}: ${chat.model.title}`,
        reply_markup: {
            inline_keyboard: [
                [{ text: `✍ ${context.uiText.changeTitle}`, callback_data: `renameChat_${chat.id}` }, { text: `🤖 ${context.uiText.changeModel}`, callback_data: "changeChatModel" }],
                [{ text: `${emojiIcon.delete} ${context.uiText.delete}`, callback_data: `confirmDeleteChat_${chat.id}` }],
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "chats" }],
            ]
        }
    };
};

export const getSubscriptionInfoPanel = async (context: RequestContext, subscriptionId: string) => {
    const info = await context.services.userSubscriptionApplication.getSubscriptionInfo(context.user.id, subscriptionId);

    if (!info)
        return null;

    const { remainingPoints, subscription } = info;

    return {
        text: (
            `${emojiIcon.extraPoint} ${context.uiText.pointPackage}`
            + `\n\n${emojiIcon.info} ${context.uiText.title}: ${context.getUit(subscription.plan.title)}`
            + stringHelper.digitLocalization(
                `\n\n${emojiIcon.point} ${context.uiText.remainingPoints}: ${remainingPoints}/${subscription.plan.points}`
                + `\n${emojiIcon.calendar} ${context.uiText.expireDate}: ${subscription.expiry.toLocaleString(context.user.lang)}`,
                context.user.lang
            )
        ),
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "mySubscriptions" }]
            ]
        }
    };
};

export const getDeleteChatConfirmPanel = async (context: RequestContext, chatId: string) => {
    return {
        text: `⚠ ${context.uiText.confirmToDelete}`,
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.ok} ${context.uiText.confirm}`, callback_data: `deleteChat_${chatId}` }],
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: `manageChat_${chatId}` }],
            ]
        }
    };
};

export const getChatListPanel = async (context: RequestContext) => {
    const chats = await context.services.openAIChatApplication.getVisibleChats(context.user.id);

    if (!chats)
        return null;

    return {
        text: chats.length > 0 ? context.uiText.savedChats : context.uiText.noSavedChats,
        reply_markup: {
            inline_keyboard: [
                ...chats.map(chat => [
                    context.user.selectedChat?.id === chat.id
                        ? { text: `${emojiIcon.ok} ${chat.caption || context.uiText.noTitle} `, callback_data: `manageChat_${chat.id}` }
                        : { text: chat.caption || context.uiText.noTitle, callback_data: `selectChat_${chat.id}` }
                ]),
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "panel" }, { text: `${chats.length >= config.chatCountLimit ? '🚫' : emojiIcon.plus} ${context.uiText.newChat}`, callback_data: "newChat" }],
            ]
        }
    };
};

export const getUserSubscriptionsList = async (context: RequestContext) => {
    const result = await context.services.userSubscriptionApplication.getActiveSubscriptionsExtendedInfo(context.user.id);

    if (!result)
        return null;

    const { paidSubscriptions: subscriptions, paidSubscriptionsTotalRemainingPoints } = result;

    return {
        text: stringHelper.digitLocalization(
            `${emojiIcon.point} ${context.uiText.pointPackages}`
            + `\n\n${context.uiText.activePackages}: ${subscriptions.length === 0 ? context.uiText.noActiveSubscription : subscriptions.length}`
            + `\n${emojiIcon.extraPoint} ${context.uiText.totalPoints}: ${paidSubscriptionsTotalRemainingPoints}`
            + (subscriptions.length > 0 ? `\n\n${context.uiText.activePackages} 👇` : ""),
            context.user.lang
        ),
        reply_markup: {
            inline_keyboard: [
                ...subscriptions.map(subscription => [
                    { text: `${context.getUit(subscription.plan.title)}`, callback_data: `manageSubscription_${subscription.id}` }
                ]),
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "panel" }, { text: `${emojiIcon.plus} ${context.uiText.purchasePackage}`, callback_data: "planList" }],
            ]
        }
    };
};

export const getPanel = async (context: RequestContext) => {
    const userInfo = await context.services.userApplication.getUserInfo(context.user.tgId);

    const inlineKeyboard = [
        [
            { text: context.uiText.chats, callback_data: "chats" },
            { text: context.uiText.models, callback_data: "modelsUsage" },
            { text: `${emojiIcon.extraPoint} ${context.uiText.pointPackages}`, callback_data: "mySubscriptions" },
        ],
        [
            (
                context.user.saveMessages ? { text: context.uiText.deactivateSaveMessages, callback_data: "deactivateSaveMessages" } : { text: context.uiText.activateSaveMessages, callback_data: "activateSaveMessages" }
            ),
            { text: `${emojiIcon.picture} ${context.uiText.createPicture}`, callback_data: "generateImage" }
        ],
    ];

    if (accessHelper(UserType.Admin, context.user.type))
        inlineKeyboard.push([{ text: context.uiText.adminPanel, callback_data: "adminPanel" }]);

    return {
        text: stringHelper.digitLocalization(
            `${emojiIcon.point} ${context.uiText.dailyFreePoints}: ${userInfo?.dailyFreePoints ? `${userInfo.dailyFreePoints.remaining}/${userInfo.dailyFreePoints.total}` : '-'}`
            + `\n\n🔹 ${context.uiText.activePackages}: ${!Number.isNaN(userInfo?.activePurchasedPlans) ? userInfo?.activePurchasedPlans : context.uiText.noActiveSubscription}`
            + (
                userInfo?.activePurchasedPlans && !Number.isNaN(userInfo?.paidSubscriptionsRemainingPoints)
                    ? `\n${emojiIcon.extraPoint} ${context.uiText.remainingPackagesPoints}: ${userInfo?.paidSubscriptionsRemainingPoints?.toLocaleString("en-US")}`
                    : ""
            )
            + `\n\n📝 ${context.uiText.saveAndUseHistory}: ${context.user.saveMessages ? `🟢 ${context.uiText.enabled} (${stringHelper.formatter(context.uiText.memoryAmount, context.user.memoryAmount)})` : `🔵 ${context.uiText.disabled}`}`
            , context.user.lang
        ),
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    };
};

export const getAdminPanel = async (context: RequestContext) => {
    const statistics = await context.services.userApplication.getAdminStatistics(context.user);

    if (!statistics)
        return null;

    return {
        text: stringHelper.digitLocalization(
            `${context.uiText.adminPanel}`
            + `\n\n${emojiIcon.users} ${context.uiText.users}: ${statistics.usersCount ?? '-'}`
            + `\n\n${emojiIcon.sparkle} ${context.uiText.todaysRequests}: ${statistics.messageUsage?.count ?? '-'}`
            + `\n${emojiIcon.point} ${context.uiText.todaysPointUsage}: ${statistics.messageUsage?.point ?? '-'}`
            + `\n${emojiIcon.cost} ${context.uiText.todaysCost}: ${statistics.messageUsage?.cost ?? '-'}`
            + `\n\n🔸 ${context.uiText.todayJoinedUsersCount}: ${statistics.todayJoinedUsersCount ?? '-'}`
            , context.user.lang
        )
            + `\n${emojiIcon.list} ${context.uiText.newUsers}: ${statistics.recentlyJoinedUsers?.length ? "\n" + statistics.recentlyJoinedUsers.map(newUser => `${emojiIcon.user} /find_${newUser.tgId} ${newUser.firstName}`).join('\n') : '-'}`
        ,
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.channel} ${context.uiText.joinRequired}`, callback_data: "joinRequiredChatsPanel" }],
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "panel" }]
            ]
        }
    };
};

export const getImageGenerateModePanel = async (context: RequestContext) => {
    return {
        text: context.uiText.describePictureInText,
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.failed} ${context.uiText.cancel}`, callback_data: "panel" }]
            ]
        }
    };
};

/** Admin panel */
export const getJoinRequiredChatsPanel = async (context: RequestContext) => {
    const chats = await context.services.telegramJoinRequiredChatApplication.getAll();

    return {
        text: chats.length === 0 ? context.uiText.noJoinRequiredChat : `${context.uiText.joinRequiredChats}:`,
        reply_markup: {
            inline_keyboard: [
                ...(chats.map(chat => [{ text: chat.title, callback_data: `manageJoinChat_${chat.id}` }])),
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "adminPanel" }, { text: `${emojiIcon.plus} ${context.uiText.add}`, callback_data: "newJoinRequiredChat" }],
            ]
        }
    };
};

/** Admin panel */
export const getJoinRequiredChatPanel = async (context: RequestContext, id: string) => {
    const chat = await context.services.telegramJoinRequiredChatApplication.getById(id);

    if (!chat)
        return null;

    return {
        text: chat.title
            + `\nlink: ${chat.link}`
            + `\nisActive: ${chat.isActive}`,
        reply_markup: {
            inline_keyboard: [
                // ...(chats.map(chat => [{ text: chat.title, callback_data: `manageJoinChat_${chat.id}` }])),
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "joinRequiredChatsPanel" }],
            ]
        }
    };
};

/** User join chats panel */
export const getJoinChatsPanel = async (context: RequestContext, hideChats: string[], isSecondary = false) => {
    const chats = (await context.services.telegramJoinRequiredChatApplication.getActives()).filter(chat => !hideChats.includes(chat.id));

    return {
        text: `${isSecondary ? `${emojiIcon.failed} ${context.uiText.notJoinedToTheseChats}:` : `${emojiIcon.warning} ${context.uiText.shouldJoinChatBeforeUse}:`}\n\n- ${context.uiText.clickCheckAfterJoin}`,
        reply_markup: {
            inline_keyboard: [
                ...(chats.map(chat => [{ text: chat.title, url: chat.link }])),
                [{ text: `${emojiIcon.ok} ${context.uiText.checkJoinChat}`, callback_data: "checkJoinRequiredChats" }],
            ]
        }
    };
};

export const getGivePhoneNumberPanel = (context: RequestContext) => {
    return {
        text: `${context.uiText.shouldGivePhoneNumber} (👇 ${context.uiText.clickBottomButton})`,
        reply_markup: {
            one_time_keyboard: true,
            resize_keyboard: true,
            force_reply: true,
            keyboard: [
                [{ text: `${emojiIcon.contact} ${context.uiText.sendPhoneNumber}`, request_contact: true }],
            ]
        }
    }
};

const modelTitleGenerator = (context: RequestContext, model: OpenAIModel) => {
    if (model.pricePmu.outputText <= 2)
        return `🟢 ${model.title} (${context.uiText.lowCost})`;

    if (model.pricePmu.outputText < 8)
        return `🟡 ${model.title} (${context.uiText.affordable})`;

    return `🔴 ${model.title} (${context.uiText.costly})`;
};

export const getModelUsageListPanel = async (context: RequestContext) => {
    const models = await context.services.openAIModelApplication.getAll();

    if (!models)
        return null;

    return {
        text: stringHelper.digitLocalization(`👇 ${context.uiText.modelUsageHelper}`
            + `\n\n⚠ ${context.uiText.modelUsageMemoryWarningHelper}\n\n`, context.user.lang)
            + models.map(model =>
                `${modelTitleGenerator(context, model)}`
                + `\n${context.uiText.approximateMessageCount}: ${stringHelper.digitLocalization(modelUsageCalculator(model).normalLengthTextMessage.toLocaleString(), context.user.lang)}`
            ).join('\n\n'),
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "panel" }],
            ]
        }
    };
};

export const getModelListPanel = async (context: RequestContext, changeChatModel?: string) => {
    const models = await context.services.openAIModelApplication.getAll();

    if (!models)
        return null;

    return {
        text: context.uiText.selectModel,
        reply_markup: {
            inline_keyboard: [
                ...models.map(model => [{ text: modelTitleGenerator(context, model), callback_data: `${changeChatModel ? "changeChatModel_" : "selectChatModel_"}${model.id}` }]),
                (changeChatModel
                    ? [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: `manageChat_${changeChatModel}` }]
                    : [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "chats" }, { text: `🤖 ${context.uiText.panel}`, callback_data: "panel" }]),
            ]
        }
    };
};

export const getUserManagementText = (context: RequestContext, userInfo: UserInfoModel | null): string => {
    if (!userInfo)
        return context.uiText.userNotFound;

    return (
        `${emojiIcon.identifier} ${userInfo.user.tgId}`
        + `\n${userInfo.user.firstName}${userInfo.user.lastName ? ` ${userInfo.user.lastName}` : ""}`
        + `\n\n${userInfo.activePurchasedPlans}`
        + `\n${new Date(userInfo.user.lastActivity).toLocaleString()}`
        + `\n${emojiIcon.free} ${userInfo.dailyFreePoints?.remaining ?? '-'}`
        + `\n${emojiIcon.contact} ${userInfo.user.phoneNumber ?? '-'}`
        + `\n\n${emojiIcon.forbidden} /${userInfo.user.status === UserStatus.Banned ? "unban" : "ban"}${userInfo.user.tgId}`
    )
};

export const getPlanList = async (context: RequestContext) => {
    const plans = await context.services.planApplication.getAllAvailable();

    if (!plans)
        return null;

    if (plans.length === 0)
        return "noPlanAvailable";

    return {
        text: `${emojiIcon.list} ${context.uiText.pointPackage}`,
        reply_markup: {
            inline_keyboard: [
                ...plans.map(plan => [{ text: context.getUit(plan.title), callback_data: `viewPlan_${plan.id}` }]),
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "mySubscriptions" }],
            ]
        }
    };
};

export const getPlanInfoPanel = async (context: RequestContext, planId: string) => {
    const plan = await context.services.planApplication.getInfo(planId);

    if (!plan)
        return null;

    return {
        text: (
            `${emojiIcon.extraPoint} ${context.getUit(plan.title)}`
            + `\n\n${emojiIcon.point} ${context.uiText.pointsAmount}: ${stringHelper.digitLocalization(plan.points.toLocaleString(context.user.lang), context.user.lang)}`
            + `\n\n${emojiIcon.calendar} ${context.uiText.subscriptionPeriod}: ${stringHelper.digitLocalization(plan.days, context.user.lang)} ${context.uiText.days}`
            + `\n\n${emojiIcon.price} ${context.uiText.price}: ${stringHelper.digitLocalization((plan.price * config.usdToIrtMultiplier).toLocaleString(context.user.lang), context.user.lang)}`
        ),
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.ok} ${context.uiText.purchase}`, callback_data: `buyPlan_${plan.id}` }],
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "planList" }],
            ]
        }
    };
};

export const getPlanBuyPanel = async (context: RequestContext, planId: string) => {
    const plan = await context.services.planApplication.getInfo(planId);

    if (!plan?.available)
        return null;

    const paymentLink = await context.services.paymentLinkApplication.getLinkByProductId(planId);

    if (!paymentLink)
        return null;

    return {
        text: (
            `${emojiIcon.warning} ${context.uiText.staticPaymentHelpText}`
        ),
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.link} ${context.uiText.purchaseLink}`, url: paymentLink.url }],
                [{ text: `${emojiIcon.failed} ${context.uiText.cancel}`, callback_data: "cancelPayment" }]
            ]
        }
    };
};

export const getStaticPaymentReceiptPanel = async (context: RequestContext, paymentId: string) => {
    const payment = await context.services.paymentApplication.getById(paymentId);

    if (!payment)
        return "itemNotFound" as UITextOptionalKey;

    const paymentUser = await context.services.userApplication.getUserById(payment.userId);

    const keyboard = [
        [{ text: `${emojiIcon.failed} ${context.uiText.close}`, callback_data: "deleteMessage" }]
    ];

    if (!payment.gatewayPaymentId)
        keyboard[0].push({ text: `${emojiIcon.plus} ${context.uiText.setPaymentId}`, callback_data: `setStaticPaymentId_${payment.id}` });

    if (payment.status === PaymentStatus.PendingApprove)
        keyboard.unshift([
            { text: `${paymentStatusIcon[PaymentStatus.Approved]} ${context.uiText.approve}`, callback_data: `approveStaticPayment_${payment.id}` },
            { text: `${paymentStatusIcon[PaymentStatus.Rejected]} ${context.uiText.reject}`, callback_data: `rejectStaticPayment_${payment.id}` }
        ]);

    return {
        text: (
            (
                paymentUser ? (`${emojiIcon.user} ${paymentUser.firstName} /find_${paymentUser.tgId}`) : (`${emojiIcon.user} ${emojiIcon.failed} User not found`)
            )
            + `\n\n${emojiIcon.calendar} ${stringHelper.dateLocalization(payment.date, context.user.lang)}`
            + `\n\n${paymentStatusIcon[payment.status]} ${context.uiText.status}: ${PaymentStatus[payment.status]}`
            + `\n\n${emojiIcon.info} ${context.uiText.gatewayPaymentId}: ${payment.gatewayPaymentId ?? '-'}`
            + (payment.rejectReason ? `\n\n${context.uiText.reason}: ${payment.rejectReason}` : "")
        ),
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
};

export const getStaticPaymentReceiptInfoKeyboard = (opts: {
    botUsername: string;
    customer: User;
    payment: Payment;
}) => {
    const managePaymentLink = startLinkGenerator(opts.botUsername, "getReceipt_" + opts.payment.id);
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.identifier} ${opts.customer.tgId}`, url: startLinkGenerator(opts.botUsername, "getUser_" + opts.customer.tgId) }],
                [{ text: `${emojiIcon.calendar} ${stringHelper.dateLocalization(opts.payment.date, opts.customer.lang)}`, url: managePaymentLink }],
                [{ text: `${emojiIcon.refresh} ${stringHelper.dateLocalization(new Date(), "en")}`, callback_data: `refreshReceipt_${opts.payment.id}` }],
                [{ text: `${emojiIcon.info} View`, url: managePaymentLink }, { text: `${paymentStatusIcon[opts.payment.status]} ${PaymentStatus[opts.payment.status]}`, url: managePaymentLink }],
            ]
        }
    };
};
