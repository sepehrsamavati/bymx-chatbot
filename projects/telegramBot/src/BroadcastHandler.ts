import tgCall from "./helpers/call.js";
import { UserStatus } from "bymx-core/shared";
import emojiIcon from "./helpers/emojiIcon.js";
import { TelegramMethods } from "./types/enums/telegramMethods.js";
import { type ServicesType, errorLogger, logger } from "bymx-core/server";
import type { IDisposable, TelegramBroadcastEntity } from "bymx-core/types";

export default class BroadcastHandler implements IDisposable {
    #processingBroadcasts = new Set<string>;
    #intervalRef = setInterval(() => {
        this.#retrieveAndBroadcast();
    }, 2 * 60e3);
    #disposing = false;
    #broadcastFinishCallback = () => { };

    constructor(
        private userApplication: ServicesType['userApplication'],
        private telegramBroadcastApplication: ServicesType['telegramBroadcastApplication'],
    ) { }

    async #sendToChat(opts: {
        targetChatId: number;
        sourceChatId: number;
        sourceMessageId: number;
        isForward: boolean;
    }) {
        const res = await tgCall(opts.isForward ? TelegramMethods.ForwardMessage : TelegramMethods.CopyMessage, {
            chat_id: opts.targetChatId,
            from_chat_id: opts.sourceChatId,
            message_id: opts.sourceMessageId
        });
        return {
            ok: res?.ok ?? false,
            botIsBlocked: !res?.ok && res?.error_code === 403 && res.description?.includes('bot was blocked')
        };
    }

    async broadcast(telegramBroadcast: TelegramBroadcastEntity.TelegramBroadcast) {
        if (this.#processingBroadcasts.has(telegramBroadcast.id) || telegramBroadcast.endDate)
            return;

        this.#processingBroadcasts.add(telegramBroadcast.id);

        const chatIds = telegramBroadcast.pendingTgIds;

        if (!telegramBroadcast.startDate)
            await this.telegramBroadcastApplication.start(telegramBroadcast.id);

        for (const chatId of chatIds) {
            if (this.#disposing)
                break;

            const res = await this.#sendToChat({
                targetChatId: chatId,
                sourceChatId: telegramBroadcast.admin.tgId,
                sourceMessageId: telegramBroadcast.messageId,
                isForward: telegramBroadcast.isForward
            });

            await Promise.all([
                this.telegramBroadcastApplication.removeTgIdFromQueue(telegramBroadcast.id, chatId, res.ok),
                res.botIsBlocked ? this.userApplication.setStatusByTelegramId(chatId, UserStatus.Blocked) : undefined
            ]);
        }

        await this.telegramBroadcastApplication.finish(telegramBroadcast.id);

        const sentCount = await this.telegramBroadcastApplication.getSentCountById(telegramBroadcast.id);

        await tgCall(TelegramMethods.SendMessage, {
            chat_id: telegramBroadcast.admin.tgId,
            text: `✅ Broadcast finished\n\n${emojiIcon.users} Sent to ${sentCount.data ?? '-'} chat(s)`,
            reply_parameters: {
                allow_sending_without_reply: true,
                message_id: telegramBroadcast.messageId
            }
        });

        this.#processingBroadcasts.delete(telegramBroadcast.id);
        this.#broadcastFinishCallback();
    }

    async #retrieveAndBroadcast() {
        if (this.#processingBroadcasts.size !== 0 || this.#disposing)
            return;

        const telegramBroadcast = await this.telegramBroadcastApplication.getOneUndone();

        if (!telegramBroadcast)
            return;

        await this.broadcast(telegramBroadcast);
    }

    trigger() {
        this.#retrieveAndBroadcast()
            .catch(err => errorLogger("Broadcast manual 'retrieveAndBroadcast' trigger", err));
    }

    dispose(): Promise<void> {
        logger.debug("⌛ Disposing broadcast handler...");

        this.#disposing = true;
        clearInterval(this.#intervalRef);

        return new Promise(resolve => {
            this.#broadcastFinishCallback = () => {
                if (this.#processingBroadcasts.size === 0) {
                    logger.debug("✅ Broadcast handler disposed.");
                    resolve();
                }
            };
            this.#broadcastFinishCallback();
        });
    }
}