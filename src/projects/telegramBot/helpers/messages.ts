import config from "../../core/config.js";
import stringHelper from "../../core/helpers/stringHelper.js";
import type { RequestContext } from "../../../types/telegram.js";
import type { OpenAIModel } from "../../../types/entities/openAIModel.js";
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
                [{ text: `↩ ${context.uiText.return}`, callback_data: "chats" }],
                [{ text: `✍ ${context.uiText.changeTitle}`, callback_data: `renameChat${chat.id}` }],
                [{ text: `❌ ${context.uiText.delete}`, callback_data: `confirmDeleteChat_${chat.id}` }],
            ]
        }
    };
};

export const getDeleteChatConfirmPanel = async (context: RequestContext, chatId: string) => {
    return {
        text: `⚠ ${context.uiText.confirmToDelete}`,
        reply_markup: {
            inline_keyboard: [
                [{ text: `↩ ${context.uiText.return}`, callback_data: `manageChat${chatId}` }],
                [{ text: `✅ ${context.uiText.confirm}`, callback_data: `deleteChat_${chatId}` }],
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
                [{ text: `↩ ${context.uiText.return}`, callback_data: "panel" }, { text: `${chats.length >= config.chatCountLimit ? '🚫' : '➕'} ${context.uiText.newChat}`, callback_data: "newChat" }],
                ...chats.map(chat => [
                    context.user.selectedChat?.id === chat.id
                        ? { text: `✅ ${chat.caption || context.uiText.noTitle} `, callback_data: `manageChat${chat.id}` }
                        : { text: chat.caption || context.uiText.noTitle, callback_data: `selectChat_${chat.id}` }
                ])
            ]
        }
    };
};

export const getPanel = async (context: RequestContext) => {
    const freePointUsage = await context.services.openAIApplication.getFreePointStatus(context.user.id);

    if (!freePointUsage)
        return null;

    return {
        text: stringHelper.digitLocalization(
            `⚡ ${context.uiText.dailyFreePoints}: ${freePointUsage.remaining}/${freePointUsage.total}`
            + `\n\n📝 ${context.uiText.saveAndUseHistory}: ${context.user.saveMessages ? `🟢 ${context.uiText.enabled} (${stringHelper.formatter(context.uiText.memoryAmount, context.user.memoryAmount)})` : `🔵 ${context.uiText.disabled}`}`
            , context.user.lang
        ),
        reply_markup: {
            inline_keyboard: [
                [{ text: context.uiText.chats, callback_data: "chats" }, { text: context.uiText.models, callback_data: "modelsUsage" }],
                [context.user.saveMessages ? { text: context.uiText.deactivateSaveMessages, callback_data: "deactivateSaveMessages" } : { text: context.uiText.activateSaveMessages, callback_data: "activateSaveMessages" }],]
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
                [{ text: `☎ ${context.uiText.sendPhoneNumber}`, request_contact: true }],
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
                [{ text: `↩ ${context.uiText.return}`, callback_data: "panel" }],
            ]
        }
    };
};

export const getModelListPanel = async (context: RequestContext) => {
    const models = await context.services.openAIModelApplication.getAll();

    if (!models)
        return null;

    return {
        text: context.uiText.selectModel,
        reply_markup: {
            inline_keyboard: [
                [{ text: `↩ ${context.uiText.return}`, callback_data: "chats" }, { text: `🤖 ${context.uiText.panel}`, callback_data: "panel" }],
                ...models.map(model => [{ text: modelTitleGenerator(context, model), callback_data: `selectChatModel${model.id}` }])
            ]
        }
    };
};
