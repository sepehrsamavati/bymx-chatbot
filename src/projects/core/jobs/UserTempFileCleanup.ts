import { errorLogger, logger } from "../helpers/logger.js";
import type { IJob } from "../../../types/contracts/job.js";
import UserTempFileApplication from "../application/UserTempFileApplication.js";

export class UserTempFileCleanup implements IJob {
    name: string = "User temp file cleanup";
    intervalMs = 2 * 60e3;

    #timer: NodeJS.Timeout | null = null;

    constructor(
        private userTempFileApplication: UserTempFileApplication
    ) { }

    start() {
        if (this.#timer) {
            logger.warn(`${this.name} already running, cannot start twice!`);
            return;
        }

        this.#timer = setInterval(() => {
            this.userTempFileApplication
                .deleteInactiveFiles()
                .catch(err => {
                    errorLogger("User temp file cleanup (deleteInactiveFiles) error: ", err);
                });
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