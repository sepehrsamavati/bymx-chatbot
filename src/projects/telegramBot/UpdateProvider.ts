import tgCall from "./helpers/call.js";
import { logger } from "../core/helpers/logger.js";
import { UpdateHandler } from "./UpdateHandler.js";
import exitHelper from "../core/helpers/exitHelper.js";
import { ExitCode } from "../../types/enums/exitCodes.js";
import { TelegramMethods } from "../../types/enums/telegramMethods.js";

export class UpdateProvider {
    #nextUpdateId = 0;
    #handler = new UpdateHandler();

    constructor() {
        this.#startBot();
    }

    async #startBot() {
        const bot = await tgCall(TelegramMethods.GetMe, null);

        if (!bot?.ok) {
            console.log("Telegram connection issue!");
            await this.#handler.dispose();
            exitHelper(ExitCode.TelegramConnectionIssue);
            return;
        }

        const botUsername = bot.result.username as string;

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

                updates.forEach(update => this.#handler.handle(update));

                const lastUpdate = updates.at(updates.length - 1);
                if (lastUpdate)
                    this.#nextUpdateId = lastUpdate.update_id + 1;
            }

            this.#getUpdates();
        } else {
            setTimeout(() => {
                this.#getUpdates();
            }, 2e3).unref();
        }
    }
}