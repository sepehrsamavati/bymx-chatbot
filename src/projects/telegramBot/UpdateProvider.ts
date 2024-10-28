import tgCall from "./helpers/call.js";
import { TelegramMethods } from "../../types/enums/telegramMethods.js";
import type { IUpdateHandler, TelegramUpdateObject } from "../../types/telegram.js";
import { logger } from "../core/helpers/logger.js";

const handlers: IUpdateHandler[] = [];

class UpdateProvider {
    #nextUpdateId = 0;

    constructor() {
        this.#startBot();
    }

    async handle(update: TelegramUpdateObject) {

        // DI start

        for (const handlerCtx of handlers) {
            const responseCtx = await handlerCtx.handler({} as any, update);

            if (!responseCtx)
                continue; // skip current handler

            if (responseCtx.call) {
                // do telegram call
            }

            if (!responseCtx.shouldContinue)
                break; // stop calling handlers
        }

        // DI end

    }

    async #startBot() {
        const bot = await tgCall(TelegramMethods.GetMe, null);

        if (!bot) {
            console.log("Telegram connection issue!");
            return;
        }

        const botUsername = (bot as any).username as string;

        logger.info(`Bot started @${botUsername}`);

        this.#getUpdates();
    }

    async #getUpdates() {
        const res = await tgCall(TelegramMethods.GetUpdates, {
            offset: this.#nextUpdateId,
            limit: 100,
            timeout: 10
        });

        if (res?.ok && res.result) {
            const updates = res.result;

            if (updates.length > 0) {

                updates.forEach(update => this.handle(update));

                const lastUpdate = updates.at(-1);
                if (lastUpdate)
                    this.#nextUpdateId = lastUpdate.update_id + 1;
            }

            this.#getUpdates();
        }
    }
}