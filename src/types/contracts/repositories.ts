import type { OpenAIModel } from "../entities/openAIModel";
import type { OpenAIMessageDBModel } from "../entities/openAIMessage";
import type { OpenAIPlan, OpenAIPlanDBModel } from "../entities/openAIPlan";
import type { User, UserDBModel, CreateUserModel, UpdateUserModel } from "../entities/user";
import { OpenAIChat, OpenAIChatDBModel } from "../entities/openAIChat";

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

export type IOpenAIModelRepository = {
    getAll(): Promise<OpenAIModel[] | null>;
    exists(id: OpenAIModel['id']): Promise<boolean | null>;
}

export type IOpenAIPlanRepository = {
    getById(id: OpenAIPlan['id']): Promise<OpenAIPlan | null>;
    getMany(filter: Pick<Partial<OpenAIPlanDBModel>, 'available'>): Promise<OpenAIPlan[] | null>;
}

export type IOpenAIChatRepository = {
    create(chat: OpenAIChatDBModel): Promise<boolean | null>;
    getUserChatById(userId: User['id'], chatId: OpenAIChat['id']): Promise<OpenAIChat | null>;
}

export type IOpenAIMessageRepository = {
    create(message: OpenAIMessageDBModel): Promise<boolean | null>;
    getUserPointUsage(user: User['id'], fromDate: Date, toDate: Date): Promise<number | null>;
}
