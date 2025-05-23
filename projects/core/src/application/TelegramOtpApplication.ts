import { User } from "../types/entities/user.js";
import type { ServicesType } from "../Container.js";
import { randomEnglishString } from "../helpers/crypto/crypto.runner.js";
import { OperationResult, OperationResultWithData } from "../common/dto/OperationResult.js";

const _2min = 2 * 60e3;

export default class TelegramOtpApplication {
    #otpScope = "tg_otp_auth";
    #cacheStorage;

    constructor(container: ServicesType) {
        this.#cacheStorage = container.otpCache;
    }

    async generateOtp(user: User) {
        const result = new OperationResultWithData<string>();

        if (this.#cacheStorage.exists(user.id))
            return result.succeeded();

        const code = randomEnglishString(4).toUpperCase();

        this.#cacheStorage.set(user.id, {
            key: user.id,
            code: code,
            date: Date.now(),
            scope: this.#otpScope,
            _expiry: Date.now() + _2min,
        });

        result.succeeded().setData(code);

        return result;
    }

    async useOtp(userId: string, code: string) {
        const result = new OperationResult().failed("invalid");
        const correctCode = this.#cacheStorage.getWithExpiryCheck(userId)?.code;

        if (!correctCode)
            result.failed();
        else if (correctCode === code) {
            this.#cacheStorage.unset(userId);
            result.succeeded();
        }

        return result;
    }
}
