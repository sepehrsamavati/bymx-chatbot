import tgCall from "./helpers/call.js";
import emojiIcon from "./helpers/emojiIcon.js";
import { TelegramUser } from "./types/telegram.js";
import { UpdateHandler } from "./UpdateHandler.js";
import { UserMode, UIText } from "bymx-core/shared";
import BroadcastHandler from "./BroadcastHandler.js";
import { TelegramMethods } from "./types/enums/telegramMethods.js";
import { initPaymentMessageCleanupJob } from "./modules/paymentMessageJob.js";
import { CoreServices, ExitCode, PaymentServices, errorLogger, exitHelper, logger, type IServices } from "bymx-core/server";

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

        initPaymentMessageCleanupJob(async item => {
            try {
                const user = await this.#services.core.applications.userApplication.getUserById(item.userId);
                if (user) {
                    await this.#services.payment.applications.paymentApplication.cancel(user.id);
                    if (user.mode === UserMode.General.StaticPayment)
                        await this.#services.core.applications.userApplication.setUserMode(user.id, UserMode.General.Normal);
                    tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: item.chatId,
                            text: `${emojiIcon.warning} ${UIText.default[user.lang]?.paymentCanceled}`,
                        }
                    );
                }
            } catch (err) {
                errorLogger("Payment automatic cleanup get user failed", err);
            }
        });

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

        if (!this.#botInfo)
            return;

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