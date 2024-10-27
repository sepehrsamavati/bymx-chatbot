import type { IUpdateHandler, TelegramUpdateObject } from "../../types/telegram.js";

const handlers: IUpdateHandler[] = [];

class UpdateProvider {
    async handle(update: TelegramUpdateObject) {

        // DI start

        for (const handlerCtx of handlers) {
            const responseCtx = await handlerCtx.handler({} as any);

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
}