import type { User, UserDBModel } from "../entities/user";

export interface ITransaction {
    start: () => Promise<boolean>;

    /** Calls end automatically */
    commit: () => Promise<boolean>;

    /** Calls end automatically */
    rollback: () => Promise<boolean>;

    end: () => Promise<boolean>;
}

export type IUserRepository = {
    /** Returns user ID on success and null on failure */
    create(user: UserDBModel): Promise<User['id'] | null>;

    /** Returns user on success and null on failure (or non existence user) */
    getBy(filter: Pick<Partial<UserDBModel>, 'id' | 'tgId' | 'isDeleted'>): Promise<User | null>;

    /** Similar to `getBy` but updates `username`, `lastActivity` and increases `usage` */
    getAndUpdate(username: UserDBModel['username'], ...args: Parameters<IUserRepository['getBy']>): ReturnType<IUserRepository['getBy']>;
}
