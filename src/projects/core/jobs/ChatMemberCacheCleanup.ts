import { logger } from "../helpers/logger.js";
import type { IJob } from "../../../types/contracts/job.js";
import type { ICacheStorage } from "../../../types/contracts/services.js";

export class ChatMemberCacheCleanup implements IJob {
    name: string = "Chat member cache cleanup";
    intervalMs = 2 * 60e3;
    readonly #cacheTtl = 1.5 * 60e3;

    #timer: NodeJS.Timeout | null = null;

    constructor(
        private cacheStorage: ICacheStorage<Date>
    ) { }

    start() {
        if (this.#timer) {
            logger.warn(`${this.name} already running, cannot start twice!`);
            return;
        }

        this.#timer = setInterval(() => {
            const keys = this.cacheStorage.getAllKeys();
            for (const key of keys) {
                const date = this.cacheStorage.get(key);
                if (date && Date.now() - date.getTime() > this.#cacheTtl)
                    this.cacheStorage.unset(key);
            }
        }, this.intervalMs).unref();
    }

    stop() {
        if (this.#timer) {
            clearInterval(this.#timer);
            this.#timer = null;
        }
        else
            logger.warn(`${this.name} is not running to be stopped!`);
    }
}