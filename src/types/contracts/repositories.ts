import type { User, UserDBModel, CreateUserModel, UpdateUserModel } from "../entities/user";

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
    create(user: CreateUserModel): Promise<User['id'] | null>;

    /** Returns user on success and null on failure (or non existence user) */
    getBy(filter: Pick<Partial<UserDBModel>, 'id' | 'tgId' | 'isDeleted'>): Promise<User | null>;

    /** Similar to `getBy` but updates `username`, `lastActivity` and increases `usage` */
    getAndUpdate(update: UpdateUserModel, ...args: Parameters<IUserRepository['getBy']>): ReturnType<IUserRepository['getBy']>;

    /** Update user partially */
    update(id: UserDBModel['id'], update: UpdateUserModel): Promise<{ ok: boolean; } | null>;
}
