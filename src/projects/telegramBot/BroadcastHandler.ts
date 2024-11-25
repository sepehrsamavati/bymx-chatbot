import tgCall from "./helpers/call.js";
import { UserStatus } from "../../types/enums/userStatus.js";
import UserApplication from "../core/application/UserApplication.js";
import type { IDisposable } from "../../types/contracts/disposable.js";
import { TelegramMethods } from "../../types/enums/telegramMethods.js";
import type { TelegramBroadcast } from "../../types/entities/telegramBroadcast.js";
import type TelegramBroadcastApplication from "../core/application/TelegramBroadcastApplication.js";

export default class BroadcastHandler implements IDisposable {
    #processingBroadcasts = new Set<string>;
    #intervalRef = setInterval(() => {
        this.#retrieveAndBroadcast();
    }, 2 * 60e3);

    constructor(
        private userApplication: UserApplication,
        private telegramBroadcastApplication: TelegramBroadcastApplication,
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

    async broadcast(telegramBroadcast: TelegramBroadcast) {
        if (this.#processingBroadcasts.has(telegramBroadcast.id) || telegramBroadcast.endDate)
            return;

        this.#processingBroadcasts.add(telegramBroadcast.id);

        const chatIds = telegramBroadcast.pendingTgIds;

        if (!telegramBroadcast.startDate)
            await this.telegramBroadcastApplication.start(telegramBroadcast.id);

        for (const chatId of chatIds) {
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

        this.#processingBroadcasts.delete(telegramBroadcast.id);
    }

    async #retrieveAndBroadcast() {
        if (this.#processingBroadcasts.size !== 0)
            return;

        const telegramBroadcast = await this.telegramBroadcastApplication.getOneUndone();

        if (!telegramBroadcast)
            return;

        await this.broadcast(telegramBroadcast);
    }

    dispose(): Promise<void> {
        clearInterval(this.#intervalRef);
        throw new Error("Method not implemented.");
    }
}