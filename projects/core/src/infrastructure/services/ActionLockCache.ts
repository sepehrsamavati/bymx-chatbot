import type { IActionLockCache } from "../../types/contracts/services.js";

export default class ActionLockCache<T> implements IActionLockCache<T> {
    #lockedItems = new Set<T>();

    isLocked(key: T): boolean {
        return this.#lockedItems.has(key);
    }

    lock(key: T): void {
        this.#lockedItems.add(key);
        return;
    }
    unlock(key: T): void {
        this.#lockedItems.delete(key);
        return;
    }
}