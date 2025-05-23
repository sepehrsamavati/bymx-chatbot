import CacheStorage from "./CacheStorage.js";
import type { IExpirableCacheStorage } from "../../types/contracts/services.js";

export default class ExpirableCacheStorage<T extends { _expiry: number; }> extends CacheStorage<T> implements IExpirableCacheStorage<T> {
    constructor() {
        super();
        setInterval(() => this.#removeExpiredItems(), 60e3);
    }

    #isExpired(item: T | null) {
        return item && item._expiry >= Date.now();
    }

    getWithExpiryCheck(key: string): T | null {
        const item = this.get(key);

        if (this.#isExpired(item)) {
            this.unset(key);
            return null;
        }

        return item;
    }

    #removeExpiredItems() {
        const keys = this.getAllKeys();

        for (const key of keys) {
            if (this.#isExpired(this.get(key)))
                this.unset(key);
        }
    }
}