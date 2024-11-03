import tgCall from "./helpers/call.js";
import CoreServices from "../core/Container.js";
import { userCommandHandler } from "./handlers/userCommandHandler.js";
import { TelegramMethods } from "../../types/enums/telegramMethods.js";
import type { IUpdateHandler, TelegramUpdateObject } from "../../types/telegram.js";

const handlers: IUpdateHandler[] = [
    userCommandHandler
];

export class UpdateHandler {
    #services = new CoreServices();

    async handle(update: TelegramUpdateObject) {
        const container = this.#services.createApplicationScope();

        const userId = update.message?.from.id;

        if (!userId)
            return;

        const user = await container.applications.userApplication.upsert({
            tgId: userId,
            firstName: "",
            lang: "fa",
        });

        if (!user)
            return;

        for (const handlerCtx of handlers) {
            const responseCtx = await handlerCtx.handler({
                user: user,
                callStack: [],
                services: container.applications
            }, update);

            if (!responseCtx)
                continue; // skip current handler

            if (responseCtx.call) {
                await tgCall(TelegramMethods.SendMessage, {
                    chat_id: userId,
                    text: responseCtx.call.text
                })
            }

            if (!responseCtx.shouldContinue)
                break; // stop calling handlers
        }

        await container.dispose();

    }
}