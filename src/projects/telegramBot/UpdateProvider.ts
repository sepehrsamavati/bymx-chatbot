import tgCall from "./helpers/call.js";
import { logger } from "../core/helpers/logger.js";
import { UpdateHandler } from "./UpdateHandler.js";
import type CoreServices from "../core/Container.js";
import BroadcastHandler from "./BroadcastHandler.js";
import exitHelper from "../core/helpers/exitHelper.js";
import { TelegramUser } from "../../types/telegram.js";
import type { IServices } from "../../types/services.js";
import { ExitCode } from "../../types/enums/exitCodes.js";
import type PaymentServices from "../staticPayment/Container.js";
import { TelegramMethods } from "../../types/enums/telegramMethods.js";

export class UpdateProvider {
    #nextUpdateId = 0;
    #handler!: UpdateHandler;
    #services: IServices;
    #broadcastHandler;
    #botInfo?: TelegramUser;

    async #dispose() {
        await this.#broadcastHandler.dispose();
        await this.#services.core.destroy();
    }

    constructor(coreServices: CoreServices, paymentServices: PaymentServices) {
        this.#services = {
            core: coreServices,
            payment: paymentServices,
        };
        this.#broadcastHandler = new BroadcastHandler(
            coreServices.applications.userApplication,
            coreServices.applications.telegramBroadcastApplication
        );

        coreServices
            .diReady()
            .then(() => {
                this.#startBot();
            });
    }

    async #startBot() {
        const botInfo = await tgCall(TelegramMethods.GetMe, null);

        if (!botInfo?.ok) {
            console.log("Telegram connection issue!");
            await this.#dispose();
            exitHelper(ExitCode.TelegramConnectionIssue);
            return;
        }

        this.#botInfo = botInfo.result;

        const botUsername = botInfo.result.username as string;
        this.#handler = new UpdateHandler(this.#services, this.#broadcastHandler, this.#botInfo);

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