import tgCall from "../helpers/call.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";

type PaymentMessageCache = {
    date: Date;
    messageId: number;
    chatId: number;
};

const validity = 5 * 60e3;
const cache = new Map<string, PaymentMessageCache>();

const deleteMessage = (item: PaymentMessageCache) => tgCall(
    TelegramMethods.DeleteMessage,
    {
        chat_id: item.chatId,
        message_id: item.messageId,
    }
);


let runLock = false;
let intervalInitialized = false;
export const initPaymentMessageCleanupJob = (onDelete: (item: { userId: string } & PaymentMessageCache) => Promise<void>) => {
    if (intervalInitialized)
        return;

    intervalInitialized = true;

    setInterval(async () => {
        if (runLock)
            return;

        runLock = true;

        const records = cache.entries();
        for (const [userId, item] of records) {
            if (new Date().getTime() - item.date.getTime() >= validity) {
                await paymentMessageCache.delete(userId);
                await onDelete({ userId, ...item });
            }
        }

        runLock = false;
    }, 60e3)
        .unref();
};

export const paymentMessageCache = Object.freeze({
    set(userId: string, item: PaymentMessageCache) {
        return cache.set(userId, item);
    },
    get(userId: string) {
        return cache.get(userId);
    },
    unset(userId: string) {
        return cache.delete(userId);
    },
    /** Delete from cache and delete message */
    async delete(userId: string) {
        const item = cache.get(userId);

        if (item)
            await deleteMessage(item);

        return cache.delete(userId);
    },
});
