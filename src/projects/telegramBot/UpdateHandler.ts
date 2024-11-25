import tgCall from "./helpers/call.js";
import CoreServices from "../core/Container.js";
import UIText, { getUit } from "../core/i18n/UIText.js";
import { panelHandler } from "./handlers/panelHandler.js";
import type BroadcastHandler from "./BroadcastHandler.js";
import { promptHandler } from "./handlers/promptHandler.js";
import { UserStatus } from "../../types/enums/userStatus.js";
import { chatManageHandler } from "./handlers/chatManageHandler.js";
import { adminPanelHandler } from "./handlers/adminPanelHandler.js";
import { userCommandHandler } from "./handlers/userCommandHandler.js";
import { TelegramMethods } from "../../types/enums/telegramMethods.js";
import { adminCommandHandler } from "./handlers/adminCommandHandler.js";
import { createNewChatHandler } from "./handlers/createNewChatHandler.js";
import { termsOfServiceHandler } from "./handlers/termsOfServiceHandler.js";
import { TelegramUpdateType } from "../../types/enums/telegramUpdateHandler.js";
import { isCompatibleType, isCompatibleUserMode } from "./helpers/handlerFilter.js";
import type { IUpdateHandler, RequestContext, ResponseContext, TelegramUpdateObject } from "../../types/telegram.js";
import { errorLogger } from "../core/helpers/logger.js";

const handlers: IUpdateHandler[] = [
    adminCommandHandler,
    userCommandHandler,
    panelHandler,
    adminPanelHandler,
    termsOfServiceHandler,
    chatManageHandler,
    createNewChatHandler,
    promptHandler
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
        private services: CoreServices,
        private broadcastHandler: BroadcastHandler
    ) { }

    async handle(update: TelegramUpdateObject) {

        const chatType = update.message?.chat.type
            ?? update.callback_query?.message?.chat.type
            ?? update.my_chat_member?.chat.type
            ?? update.channel_post?.chat.type
            ?? null;

        if (chatType !== "private")
            return;

        const fromTgUser = update.message?.from
            ?? update.callback_query?.message.chat
            ?? update.inline_query?.from
            ?? update.my_chat_member?.from
            ?? update.channel_post?.from
            ?? null;

        const userId = fromTgUser?.id ?? null;

        if (!userId)
            return;

        // user root container (do not create scope)
        const user = await this.services.applications.userApplication.upsert({
            tgId: userId,
            firstName: fromTgUser?.first_name ?? "",
            lastName: fromTgUser?.last_name,
            username: fromTgUser?.username,
            lang: "fa",
        });

        if (!user)
            return;

        if (user.status === UserStatus.Banned)
            return;

        const container = this.services.createApplicationScope();

        if (user.status === UserStatus.Blocked)
            await container.applications.userApplication.setUserStatus(user.id, UserStatus.EULA);

        let _handlers: IUpdateHandler[] = [];

        // consider message type
        if (update.message) {
            if (update.message.text) {
                _handlers = handlerTypeFilter[TelegramUpdateType.TextMessage];
            } else {
                _handlers = handlerTypeFilter[TelegramUpdateType.Message];
            }
        } else if (update.callback_query) {
            _handlers = handlerTypeFilter[TelegramUpdateType.CallbackQuery];
        }

        // consider user modes
        _handlers = _handlers.filter(h => isCompatibleUserMode(h, user.mode));

        let callStack: IUpdateHandler[] = [];

        const requestContext: RequestContext = {
            user: user,
            uiText: UIText.fa,
            callStack: callStack,
            getUit: keyOrMessage => getUit(requestContext.uiText, keyOrMessage),
            services: container.applications,
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
                    + `\n   - Callstack: ${requestContext.callStack.length > 0 ? requestContext.callStack.map(handler => handler.name).join(' / ') : '-'}`
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