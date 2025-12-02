import { TelegramUser } from "./types/telegram.js";
import { UpdateHandler } from "./UpdateHandler.js";
import BroadcastHandler from "./BroadcastHandler.js";
import { _injectTelegramClient } from "./helpers/call.js";
import { ExitCode, exitHelper, logger, type IServices } from "bymx-core/server";
import { init as initGenerationTaskEventListener } from "./modules/generationTaskEventListener.js";

export class UpdateProvider {
    #nextUpdateId = 0;
    #handler!: UpdateHandler;
    #services: IServices;
    #apiClient;
    #broadcastHandler;
    #botInfo?: TelegramUser;

    async #dispose() {
        await this.#broadcastHandler.dispose();
        this.#services.dispose();
    }

    constructor(services: IServices) {
        this.#services = services;
        this.#apiClient = services.core.exposedServices.telegramApiClient;
        this.#broadcastHandler = new BroadcastHandler(
            services.core.applications.userApplication,
            services.core.applications.telegramBroadcastApplication
        );

        _injectTelegramClient(this.#apiClient);

        this.#startBot();
    }

    async #startBot() {
        const botInfo = await this.#apiClient.call(this.#apiClient.Methods.GetMe, null);

        if (!botInfo?.ok) {
            console.log("Telegram connection issue!");
            await this.#dispose();
            exitHelper(ExitCode.TelegramConnectionIssue);
            return;
        }

        this.#botInfo = botInfo.result;

        if (!this.#botInfo)
            return;

        const botUsername = botInfo.result.username as string;

        initGenerationTaskEventListener(botUsername);

        this.#handler = new UpdateHandler(this.#services, this.#broadcastHandler, this.#botInfo);

        logger.info(`Bot started @${botUsername}`);

        this.#getUpdates();
    }

    async #getUpdates() {
        const res = await this.#apiClient.call(this.#apiClient.Methods.GetUpdates, {
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