import tgCall from "./helpers/call.js";
import { UIText, UserStatus } from "bymx-core/shared";
import { planHandler } from "./handlers/planHandler.js";
import { panelHandler } from "./handlers/panelHandler.js";
import type BroadcastHandler from "./BroadcastHandler.js";
import { inviteHandler } from "./handlers/inviteHandler.js";
import { promptHandler } from "./handlers/promptHandler.js";
import { errorLogger, type IServices } from "bymx-core/server";
import { joinChatHandler } from "./handlers/joinChatHandler.js";
import { TelegramMethods } from "./types/enums/telegramMethods.js";
import { chatManageHandler } from "./handlers/chatManageHandler.js";
import { adminPanelHandler } from "./handlers/adminPanelHandler.js";
import { userCommandHandler } from "./handlers/userCommandHandler.js";
import { adminCommandHandler } from "./handlers/adminCommandHandler.js";
import { createNewChatHandler } from "./handlers/createNewChatHandler.js";
import { receiptManageHandler } from "./handlers/receiptManageHandler.js";
import { imageGenerateHandler } from "./handlers/imageGenerateHandler.js";
import { TelegramUpdateType } from "./types/enums/telegramUpdateHandler.js";
import { termsOfServiceHandler } from "./handlers/termsOfServiceHandler.js";
import { joinRequiredChatHandler } from "./handlers/joinRequiredChatHandler.js";
import { isCompatibleType, isCompatibleUserMode } from "./helpers/handlerFilter.js";
import { adminJoinChatPanelHandler } from "./handlers/adminJoinChatPanelHandler.js";
import { subscriptionManageHandler } from "./handlers/subscriptionManageHandler.js";
import { voiceResponseManageHandler } from "./handlers/voiceResponseManageHandler.js";
import type { IUpdateHandler, RequestContext, ResponseContext, TelegramUpdateObject, TelegramUser } from "./types/telegram.js";

const handlers: IUpdateHandler[] = [
    joinChatHandler,
    adminCommandHandler,
    userCommandHandler,
    receiptManageHandler,
    planHandler,
    panelHandler,
    voiceResponseManageHandler,
    joinRequiredChatHandler,
    adminPanelHandler,
    adminJoinChatPanelHandler,
    termsOfServiceHandler,
    inviteHandler,
    chatManageHandler,
    subscriptionManageHandler,
    createNewChatHandler,
    imageGenerateHandler,
    promptHandler,
];

const handlerTypeFilter: {
    [Key in TelegramUpdateType]: IUpdateHandler[];
} = {} as typeof handlerTypeFilter;

Object
    .keys(TelegramUpdateType)
    .map(v => Number.parseInt(v))
    .filter(v => !Number.isNaN(v))
    .forEach((v: TelegramUpdateType) => {
        // compute one time and cache
        handlerTypeFilter[v] = handlers.filter(h => isCompatibleType(h, v));
    });

export class UpdateHandler {
    constructor(
        private services: IServices,
        private broadcastHandler: BroadcastHandler,
        private botInfo: TelegramUser,
    ) { }

    async handle(update: TelegramUpdateObject) {

        const chat = update.message?.chat
            ?? update.callback_query?.message?.chat
            ?? update.my_chat_member?.chat
            ?? update.channel_post?.chat;

        const fromTgUser = update.message?.from
            ?? update.callback_query?.from
            ?? update.inline_query?.from
            ?? update.my_chat_member?.from
            ?? update.channel_post?.from
            ?? null;

        const userId = fromTgUser?.id ?? null;

        if (!userId)
            return;

        let inviterUserId: string | undefined = undefined;

        // invite link handler
        if (update.message?.text?.startsWith("/start i")) {
            const inviterTgId = Number.parseInt(update.message.text.replace("/start i", ""));
            if (!Number.isNaN(inviterTgId)) {
                const inviter = await this.services.core.applications.userApplication.getUserByTgId(inviterTgId);
                if (inviter)
                    inviterUserId = inviter.id;
            }
        }

        // use root container (do not create scope)
        const user = await this.services.core.applications.userApplication.upsert({
            tgId: userId,
            firstName: fromTgUser?.first_name ?? "",
            lastName: fromTgUser?.last_name,
            username: fromTgUser?.username,
            lang: "fa",
            invite: inviterUserId ? { by: inviterUserId, used: false } : undefined
        });

        if (!user)
            return;

        if (user.status === UserStatus.Banned)
            return;

        if (update.my_chat_member) {
            const newChatMember = update.my_chat_member.new_chat_member;
            if (newChatMember.user.id === this.botInfo.id && newChatMember.status === "kicked") {
                await this.services.core.applications.userApplication.setUserStatus(user.id, UserStatus.Blocked);
                return;
            }
        }

        const container = this.services.core.createApplicationScope();

        if (user.status === UserStatus.Blocked)
            await container.applications.userApplication.setUserStatus(user.id, UserStatus.EULA);

        let _handlers: IUpdateHandler[] = [];

        // consider message type
        if (update.message) {
            if (update.message.text) {
                _handlers = handlerTypeFilter[TelegramUpdateType.TextMessage];
            } else if (update.message.voice) {
                _handlers = handlerTypeFilter[TelegramUpdateType.Voice];
            } else {
                _handlers = handlerTypeFilter[TelegramUpdateType.Message];
            }
        } else if (update.callback_query) {
            _handlers = handlerTypeFilter[TelegramUpdateType.CallbackQuery];
        } else {
            _handlers = handlerTypeFilter[TelegramUpdateType.All];
        }

        // consider user modes
        _handlers = _handlers.filter(h => isCompatibleUserMode(h, user.mode));

        // consider chat types
        _handlers = _handlers.filter(h => h.chatTypes && chat?.type ? (h.chatTypes.includes("all") || h.chatTypes.includes(chat.type)) : chat?.type === "private");

        let callStack: IUpdateHandler[] = [];

        const requestContext: RequestContext = {
            user: user,
            uiText: UIText.default.fa,
            callStack: callStack,
            chat,
            botId: this.botInfo.id,
            botUsername: this.botInfo.username ?? "ERROR",
            getUit: keyOrMessage => UIText.getUit(requestContext.uiText, keyOrMessage),
            services: {
                ...container.applications,
                ...this.services.payment.applications
            },
            broadcastTrigger: () => this.broadcastHandler.trigger()
        };

        for (const handlerCtx of _handlers) {
            let responseCtx: ResponseContext | null = null;

            try {
                responseCtx = await handlerCtx.handler(requestContext, update);
            } catch (err) {
                errorLogger(
                    `Unhandled exception in handler '${handlerCtx.name}'`
                    + `\n   - Time (local): ${new Date().toLocaleString()}`
                    + `\n   - User ID: ${user.id}`
                    + `\n   - Telegram ID: ${user.tgId}`
                    + `\n   - Handler callstack: ${requestContext.callStack.length > 0 ? requestContext.callStack.map(handler => handler.name.split(/\\|\//).pop()?.split('.').shift()).join(' / ') : '-'}`
                    + `\n   - Callstack: ${err instanceof Error ? err.stack ?? "-" : "-"}`
                    + "\n"
                    , err);
                break;
            }

            callStack.push(handlerCtx);

            if (!responseCtx)
                continue; // skip current handler

            if (responseCtx.call) {
                await tgCall(TelegramMethods.SendMessage, {
                    chat_id: userId,
                    text: requestContext.getUit(responseCtx.call.text),
                    ...(update.message ? {
                        reply_parameters: {
                            allow_sending_without_reply: true,
                            message_id: update.message.message_id
                        }
                    } : {})
                })
            }

            if (!responseCtx.shouldContinue)
                break; // stop calling handlers
        }

        await container.dispose();

    }
}