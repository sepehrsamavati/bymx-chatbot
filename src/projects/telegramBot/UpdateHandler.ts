import tgCall from "./helpers/call.js";
import CoreServices from "../core/Container.js";
import UIText, { getUit } from "../core/i18n/UIText.js";
import { panelHandler } from "./handlers/panelHandler.js";
import { promptHandler } from "./handlers/promptHandler.js";
import { chatManageHandler } from "./handlers/chatManageHandler.js";
import { adminPanelHandler } from "./handlers/adminPanelHandler.js";
import { userCommandHandler } from "./handlers/userCommandHandler.js";
import { TelegramMethods } from "../../types/enums/telegramMethods.js";
import { adminCommandHandler } from "./handlers/adminCommandHandler.js";
import { createNewChatHandler } from "./handlers/createNewChatHandler.js";
import { termsOfServiceHandler } from "./handlers/termsOfServiceHandler.js";
import { TelegramUpdateType } from "../../types/enums/telegramUpdateHandler.js";
import { isCompatibleType, isCompatibleUserMode } from "./helpers/handlerFilter.js";
import type { IUpdateHandler, RequestContext, TelegramUpdateObject } from "../../types/telegram.js";

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
    #services = new CoreServices();

    async handle(update: TelegramUpdateObject) {
        const container = this.#services.createApplicationScope();

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

        const user = await container.applications.userApplication.upsert({
            tgId: userId,
            firstName: fromTgUser?.first_name ?? "",
            lastName: fromTgUser?.last_name,
            username: fromTgUser?.username,
            lang: "fa",
        });

        if (!user)
            return;

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
        };

        for (const handlerCtx of _handlers) {
            const responseCtx = await handlerCtx.handler(requestContext, update);

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

    dispose() {
        return this.#services.destroy();
    }
}