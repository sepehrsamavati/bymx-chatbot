import getPlanInfoView from "./getPlanInfoView.js";
import startLinkGenerator from "./startLinkGenerator.js";
import { config, costCalculator } from "bymx-core/server";
import type { RequestContext } from "../types/telegram.js";
import { AiModelEntity, PaymentEntity, UserEntity } from "bymx-core/types";
import emojiIcon, { paymentStatusIcon } from "./emojiIcon.js";
import { accessHelper, AIChatHistoryMemory, aiVoices, PaymentStatus, reduceTo2DArray, stringHelper, UIText, UserStatus, UserType } from "bymx-core/shared";

export const getChatPanel = async (context: RequestContext, chatId: string) => {
    const chat = await context.services.aiChatApplication.getUserChatById(context.user.id, chatId);

    if (!chat)
        return null;

    return {
        text: `ℹ ${context.uiText.title}: ${chat.title || context.uiText.noTitle}`
            + `\n\n${emojiIcon.model} ${context.uiText.model}: ${chat.model.title}`,
        reply_markup: {
            inline_keyboard: [
                [{ text: `✍ ${context.uiText.changeTitle}`, callback_data: `renameChat_${chat.id}` }, { text: `${emojiIcon.model} ${context.uiText.changeModel}`, callback_data: "changeChatModel" }],
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
    const chats = await context.services.aiChatApplication.getVisibleChats(context.user.id);

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
        ],
        [
            { text: `${emojiIcon.gift} ${context.uiText.inviteFriends}`, callback_data: "myInviteLink" },
            { text: `${emojiIcon.extraPoint} ${context.uiText.pointPackages}`, callback_data: "mySubscriptions" },
        ],
        [
            (
                context.user.saveMessages ? { text: context.uiText.deactivateSaveMessages, callback_data: "deactivateSaveMessages" } : { text: context.uiText.activateSaveMessages, callback_data: "activateSaveMessages" }
            ),
            { text: `${emojiIcon.history} ${context.uiText.changeMemoryAmount}`, callback_data: "changeMemoryAmount" }
        ],
        [
            { text: `${emojiIcon.speaking} ${context.uiText.voiceResponse}`, callback_data: "voiceResponsePanel" },
        ],
        [
            { text: `${emojiIcon.tools} ${context.uiText.tools}`, callback_data: "aiTools" },
        ]
    ];

    if (accessHelper(UserType.Admin, context.user.type))
        inlineKeyboard.push([{ text: context.uiText.adminPanel, callback_data: "adminPanel" }]);

    const memoryUIT = ({
        [AIChatHistoryMemory.None]: context.uiText.errorOccurred,
        [AIChatHistoryMemory.Short]: context.uiText.low,
        [AIChatHistoryMemory.Normal]: context.uiText.normal,
        [AIChatHistoryMemory.Long]: context.uiText.high,
    })[context.user.memoryAmount] || context.uiText.errorOccurred;

    return {
        text: stringHelper.digitLocalization(
            `${emojiIcon.point} ${context.uiText.dailyFreePoints}: ${userInfo?.dailyFreePoints ? `${userInfo.dailyFreePoints.remaining}/${userInfo.dailyFreePoints.total}` : '-'}`
            + `\n\n🔹 ${context.uiText.activePackages}: ${!Number.isNaN(userInfo?.activePurchasedPlans) && userInfo?.activePurchasedPlans !== 0 ? userInfo?.activePurchasedPlans : context.uiText.noActiveSubscription}`
            + `\n${emojiIcon.price} ${context.uiText.buyPlans}: /plans`
            + `\n\n${emojiIcon.users} ${context.uiText.invitedCount}: ${userInfo?.user.inviteCount}`
            + (
                userInfo?.activePurchasedPlans && !Number.isNaN(userInfo?.paidSubscriptionsRemainingPoints)
                    ? `\n${emojiIcon.extraPoint} ${context.uiText.remainingPackagesPoints}: ${stringHelper.thousandSeparator(userInfo?.paidSubscriptionsRemainingPoints ?? "")}`
                    : ""
            )
            + `\n\n📝 ${context.uiText.saveAndUseHistory}: ${context.user.saveMessages ? `🟢 ${context.uiText.enabled} (${context.uiText.memory}: ${memoryUIT})` : `🔵 ${context.uiText.disabled}`}`
            + `\n\n${emojiIcon.speaking} ${context.uiText.voiceResponse}: ${context.user.voiceResponse.on ? `${emojiIcon.volumeHigh} ${context.uiText.enabled}` : `${emojiIcon.volumeMute} ${context.uiText.disabled}`}`
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

export const getAiToolsPanel = async (context: RequestContext) => {
    const inlineKeyboard = [
        [
            { text: `${emojiIcon.chat} ${context.uiText.chatWithChatGpt}`, callback_data: "textBasedCommunication" },
        ],
        [
            { text: `${emojiIcon.picture} ${context.uiText.createPicture}`, callback_data: "generateImage" },
        ],
        [
            { text: `${emojiIcon.music} ${context.uiText.createSongWithLyrics}`, callback_data: "generateMusicWithLyrics" },
        ],
        [
            { text: `${emojiIcon.picture} ${context.uiText.imageUpscale}`, callback_data: "imageUpscale" },
        ],
        [
            { text: `${emojiIcon.triangularRuler} ${context.uiText.create3dModelFromImage}`, callback_data: "create3dModel" },
        ],
        [{ text: `${emojiIcon.return} ${context.uiText.panel}`, callback_data: "panel" }]
    ];

    return {
        text: context.uiText.selectAiToolFromList,
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    };
};

export const getVoiceResponsePanel = async (context: RequestContext) => {
    return {
        text: (
            `${context.uiText.voiceResponse}: ${context.user.voiceResponse.on ? `${emojiIcon.volumeHigh} ${context.uiText.enabled}` : `${emojiIcon.volumeMute} ${context.uiText.disabled}`}`
            + `\n\n${emojiIcon.speaking} ${context.uiText.voiceType}: ${stringHelper.capitalizeFirstLetter(context.user.voiceResponse.type)}`
            + `\n\n${emojiIcon.studioMicrophone} ${context.uiText.inputVoiceLanguage}: ${context.user.voiceResponse.languagePrompt || context.uiText.automatic}`
            // + `\n* ${context.uiText.selectingInputVoiceLanguageWouldHelp}`
        )
        ,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: `${emojiIcon.speaking} ${context.uiText.changeVoiceType}`, callback_data: "selectVoiceResponseType" },
                    (
                        context.user.voiceResponse.on ? { text: `${emojiIcon.volumeMute} ${context.uiText.deactivate}`, callback_data: "deactivateVoiceResponse" } : { text: `${emojiIcon.volumeHigh} ${context.uiText.activate}`, callback_data: "activateVoiceResponse" }
                    ),
                ],
                [{ text: `${emojiIcon.panel} ${context.uiText.panel}`, callback_data: "panel" }],
            ]
        }
    };
};

export const getChangeVoiceResponseTypePanel = async (context: RequestContext) => {
    return {
        text: (
            `${context.uiText.changeVoiceType}`
            + `\n\n${emojiIcon.speaking} ${context.uiText.currentVoiceType}: ${stringHelper.capitalizeFirstLetter(context.user.voiceResponse.type)}`
        )
        ,
        reply_markup: {
            inline_keyboard: [
                ...reduceTo2DArray(aiVoices.map(aiVoice => ({ text: `${context.user.voiceResponse.type === aiVoice ? `${emojiIcon.checked} ` : ""}${stringHelper.capitalizeFirstLetter(aiVoice)}`, callback_data: `selectVoiceResponseType_${aiVoice}` }))),
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "voiceResponsePanel" }],
            ]
        }
    };
};

export const getImageGenerateModePanel = async (context: RequestContext) => {
    return {
        text: context.uiText.describePictureInText + `\n\n${emojiIcon.warning} ${context.uiText.modelSupportsEnglishInputBetterHint}`,
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.failed} ${context.uiText.cancel}`, callback_data: "panel" }]
            ]
        }
    };
};

export const getTextBasedCommunicationPanel = async (context: RequestContext) => {
    return {
        text: context.uiText.textBasedCommunicationHelp + "\n\n" + context.uiText.textBasedCommunicationTgHelp,
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.tools} ${context.uiText.tools}`, callback_data: "aiTools" }]
            ]
        }
    };
};

export const getMusicWithLyricsGenerationPanel = async (context: RequestContext) => {
    return {
        text: stringHelper.digitLocalization(
            context.uiText.musicWithLyricsGenerationHelp
            + "\n\n" + context.uiText.musicWithLyricsGenerationTgHelp
            + `\n\n${emojiIcon.warning} ${context.uiText.modelSupportsEnglishInputBetterHint}`
            + `\n\n${emojiIcon.watch} ${context.uiText.estimatedResponseTime}: ${stringHelper.millisecondsToHumanReadable(60e3, context.uiText)}`,
            context.user.lang
        ),
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.failed} ${context.uiText.cancel}`, callback_data: "panel" }]
            ]
        }
    };
};

export const get3dModelGenerationPanel = async (context: RequestContext) => {
    return {
        text: stringHelper.digitLocalization(
            context.uiText.create3dModelFromImage
            + "\n\n" + context.uiText.create3dModelHelp
            + `\n\n${emojiIcon.watch} ${context.uiText.estimatedResponseTime}: ${stringHelper.millisecondsToHumanReadable(30e3, context.uiText)}`,
            context.user.lang
        ),
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.failed} ${context.uiText.cancel}`, callback_data: "panel" }]
            ]
        }
    };
};

export const getImageUpscalePanel = async (context: RequestContext) => {
    return {
        text: stringHelper.digitLocalization(
            context.uiText.imageUpscale
            + "\n\n" + context.uiText.imageUpscaleHelp
            + `\n\n${emojiIcon.warning} ${context.uiText.imageUpscaleTgHelp}`
            + `\n\n${emojiIcon.watch} ${context.uiText.estimatedResponseTime}: ${stringHelper.millisecondsToHumanReadable(5e3, context.uiText)}`,
            context.user.lang
        ),
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

const modelTitleGenerator = (context: RequestContext, model: AiModelEntity.AIModel) => {
    if (model.pricePmu.outputText <= 2)
        return `🟢 ${model.title} (${context.uiText.lowCost})`;

    if (model.pricePmu.outputText < 8)
        return `🟡 ${model.title} (${context.uiText.affordable})`;

    return `🔴 ${model.title} (${context.uiText.costly})`;
};

export const getModelUsageListPanel = async (context: RequestContext) => {
    const models = context.services.aiModelApplication.getChatModels();

    return {
        text: stringHelper.digitLocalization(`👇 ${context.uiText.modelUsageHelper}`
            + `\n\n⚠ ${context.uiText.modelUsageMemoryWarningHelper}\n\n`, context.user.lang)
            + models.map(model =>
                `${modelTitleGenerator(context, model)}`
                + `\n${context.uiText.approximateMessageCount}: ${stringHelper.digitLocalization(stringHelper.thousandSeparator(costCalculator.modelUsageCalculator(model).normalLengthTextMessage), context.user.lang)}`
            ).join('\n\n'),
        reply_markup: {
            inline_keyboard: [
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "panel" }],
            ]
        }
    };
};

export const getModelListPanel = async (context: RequestContext, changeChatModel?: string) => {
    const models = context.services.aiModelApplication.getChatModels();

    return {
        text: context.uiText.selectModel,
        reply_markup: {
            inline_keyboard: [
                ...models.map(model => [{ text: modelTitleGenerator(context, model), callback_data: `${changeChatModel ? "changeChatModel_" : "selectChatModel_"}${model.id}` }]),
                (changeChatModel
                    ? [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: `manageChat_${changeChatModel}` }]
                    : [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "chats" }, { text: `${emojiIcon.panel} ${context.uiText.panel}`, callback_data: "panel" }]),
            ]
        }
    };
};

export const getUserManagementText = (context: RequestContext, userInfo: UserEntity.UserInfoModel | null): string => {
    if (!userInfo)
        return context.uiText.userNotFound;

    return (
        `${emojiIcon.identifier} ${userInfo.user.tgId}${userInfo.user.username ? " @" + userInfo.user.username : ""}`
        + `\n${userInfo.user.firstName}${userInfo.user.lastName ? ` ${userInfo.user.lastName}` : ""}`
        + `\n\n${emojiIcon.sparkle} ${userInfo.activePurchasedPlans ?? '-'}`
        + `\n${emojiIcon.time} ${new Date(userInfo.user.lastActivity).toLocaleString()}`
        + `\n${emojiIcon.free} ${userInfo.dailyFreePoints?.remaining ?? '-'}`
        + `\n${emojiIcon.extraPoint} ${userInfo.paidSubscriptionsRemainingPoints ?? '-'}`
        + `\n${emojiIcon.contact} ${userInfo.user.phoneNumber ?? '-'}`
        + `\n\n${emojiIcon.forbidden} /${userInfo.user.status === UserStatus.Banned ? "unban" : "ban"}${userInfo.user.tgId}`
        + `\n\nReply these to any message to send/forward:\n/send_${userInfo.user.tgId}\n/forward_${userInfo.user.tgId}`
    )
};

export const getPlanList = async (context: RequestContext) => {
    const plans = await context.services.planApplication.getAllAvailable();

    if (!plans)
        return null;

    if (plans.length === 0)
        return "noPlanAvailable";

    const plansInfo = plans.map(plan => getPlanInfoView(context, plan));
    let planListText = plansInfo.map(item => `${item.title}\n${item.caption}`).join('\n\n');

    return {
        text: `${emojiIcon.list} ${context.uiText.pointPackage}` + (planListText.length < 3500 ? `\n\n${planListText}` : ""),
        reply_markup: {
            inline_keyboard: [
                ...plansInfo.map(planInfo => [{ text: planInfo.title, callback_data: `viewPlan_${planInfo.plan.id}` }]),
                [{ text: `${emojiIcon.return} ${context.uiText.return}`, callback_data: "mySubscriptions" }],
            ]
        }
    };
};

export const getPlanInfoPanel = async (context: RequestContext, planId: string) => {
    const plan = await context.services.planApplication.getInfo(planId);

    if (!plan)
        return null;

    const planInfo = getPlanInfoView(context, plan);

    return {
        text: planInfo.fullInfo,
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
        return "itemNotFound" as UIText.UITextOptionalKey;

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
    customer: UserEntity.User;
    payment: PaymentEntity.Payment;
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
