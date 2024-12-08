import tgCall from "../helpers/call.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";

type PaymentMessageCache = {
    date: Date;
    messageId: number;
    chatId: number;
};

const cache = new Map<string, PaymentMessageCache>();

let runLock = false;

setInterval(async () => {
    if (runLock)
        return;

    runLock = true;

    const records = cache.entries();
    for (const [userId, item] of records) {
        if (new Date().getTime() - item.date.getTime() >= 5 * 60e3) {
            await paymentMessageCache.delete(userId);
        }
    }

    runLock = false;
}, 60e3)
    .unref();

const deleteMessage = (item: PaymentMessageCache) => tgCall(
    TelegramMethods.DeleteMessage,
    {
        chat_id: item.chatId,
        message_id: item.messageId,
    }
);

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
    async delete(userId: string) {
        const item = cache.get(userId);

        if (item)
            await deleteMessage(item);

        return cache.delete(userId);
    },
});
