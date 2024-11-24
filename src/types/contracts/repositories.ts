import type { CaptionOnly } from "./entities";
import type { OpenAIModel } from "../entities/openAIModel";
import type { OpenAIPlan, OpenAIPlanDBModel } from "../entities/openAIPlan";
import type { OpenAIMessage, OpenAIMessageDBModel } from "../entities/openAIMessage";
import type { User, UserDBModel, CreateUserModel, UpdateUserModel, SearchUserModel } from "../entities/user";
import type { OpenAIChat, OpenAIChatDBModel, SearchOpenAIChat, UpdateOpenAIChat } from "../entities/openAIChat";
import type { UpdateUserSubscription, UserSubscription, UserSubscriptionDBModel } from "../entities/userSubscription";
import type { CreateUserTempFile, SearchUserTempFile, UpdateUserTempFile, UserTempFile } from "../entities/userTempFile";
import { CreateTelegramBroadcast } from "../entities/telegramBroadcast";

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
    getBy(filter: SearchUserModel): Promise<User | null>;

    /** Similar to `getBy` but updates `username`, `lastActivity` and increases `usage` */
    getAndUpdate(update: UpdateUserModel, ...args: Parameters<IUserRepository['getBy']>): ReturnType<IUserRepository['getBy']>;

    /** Update user partially */
    update(id: UserDBModel['id'], update: UpdateUserModel): Promise<{ ok: boolean; } | null>;

    /** Count all users (no filter | deleted, blocked, ...) */
    countAll(): Promise<number | null>;
}

export type IUserSubscriptionRepository = {
    create(userSubscription: Omit<UserSubscriptionDBModel, 'id'>): Promise<boolean | null>;
    updateById(userSubscription: UpdateUserSubscription): Promise<boolean | null>;
    getActive(userId: User['id'], expiryNotBefore: Date): Promise<Omit<UserSubscription, 'user'> | null>;
    getAllActives(userId: User['id'], expiryNotBefore: Date): Promise<Omit<UserSubscription, 'user'>[] | null>;
    countByUserId(userId: User['id'], expiryNotBefore: Date): Promise<number | null>;
}

export type ITelegramBroadcastRepository = {
    create(telegramBroadcast: CreateTelegramBroadcast): Promise<boolean | null>;
    deletePendingUser(id: string, tgId: User['tgId'], increaseOkCount: boolean): Promise<boolean | null>;
    delete(id: string): Promise<boolean | null>;
}

export type IUserTempFileRepository = {
    create(userTempFile: CreateUserTempFile): Promise<boolean | null>;
    /** Gets entity and updates `lastAccessed` property */
    get(filter: SearchUserTempFile): Promise<Omit<UserTempFile, 'user'> | null>;
    getInactive(lastAccessedLowerThan: Date, limit: number): Promise<Omit<UserTempFile, 'user'>[] | null>;
    updateById(update: UpdateUserTempFile): Promise<boolean | null>;
    countUserUsage(userId: string, fromDate: Date): Promise<number | null>;
}

export type IOpenAIModelRepository = {
    getAll(): Promise<OpenAIModel[] | null>;
    getById(id: OpenAIModel['id']): Promise<OpenAIModel | null>;
    exists(id: OpenAIModel['id']): Promise<boolean | null>;
}

export type IOpenAIPlanRepository = {
    getById(id: OpenAIPlan['id']): Promise<OpenAIPlan | null>;
    getMany(filter: Pick<Partial<OpenAIPlanDBModel>, 'available'>): Promise<OpenAIPlan[] | null>;
}

export type IOpenAIChatRepository = {
    create(chat: Omit<OpenAIChatDBModel, 'id'>): Promise<OpenAIChatDBModel['id'] | null>;
    updateById(update: UpdateOpenAIChat): Promise<boolean | null>;
    getChat(filter: SearchOpenAIChat): Promise<Omit<OpenAIChat, 'user'> | null>;
    exists(userId: string): Promise<boolean | null>;
    getChats(filter: SearchOpenAIChat): Promise<CaptionOnly[] | null>;
    count(filter: SearchOpenAIChat): Promise<number | null>;
}

export type IOpenAIMessageRepository = {
    create(message: OpenAIMessageDBModel): Promise<boolean | null>;
    getPlanPointUsage(plan: OpenAIPlan['id']): Promise<number | null>;
    getFreePointUsage(userId: string, fromDate: Date, toDate: Date): Promise<number | null>;
    getUsage(fromDate: Date, toDate: Date): Promise<{ count: number; point: number; cost: number; } | null>;
    getRecentHistory(chatId: string, count: number): Promise<OpenAIMessage[] | null>;
    countUserFileUsage(userId: string, fromDate: Date): Promise<number | null>;
}
