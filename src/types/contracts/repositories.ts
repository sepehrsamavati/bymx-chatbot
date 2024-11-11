import type { CaptionOnly } from "./entities";
import type { OpenAIModel } from "../entities/openAIModel";
import type { OpenAIMessageDBModel } from "../entities/openAIMessage";
import type { OpenAIPlan, OpenAIPlanDBModel } from "../entities/openAIPlan";
import type { User, UserDBModel, CreateUserModel, UpdateUserModel } from "../entities/user";
import type { OpenAIChat, OpenAIChatDBModel, SearchOpenAIChat } from "../entities/openAIChat";
import type { UserSubscription, UserSubscriptionDBModel } from "../entities/userSubscription";

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

export type IUserSubscriptionRepository = {
    create(userSubscription: UserSubscriptionDBModel): Promise<boolean | null>;
    getActive(userId: User['id'], expiryNotBefore: Date): Promise<Omit<UserSubscription, 'user'> | null>;
    getAllActives(userId: User['id'], expiryNotBefore: Date): Promise<Omit<UserSubscription, 'user'>[] | null>;
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
    create(chat: Omit<OpenAIChatDBModel, 'id'>): Promise<OpenAIChatDBModel['id'] | null>;
    getChat(filter: SearchOpenAIChat): Promise<Omit<OpenAIChat, 'user'> | null>;
    exists(userId: string): Promise<boolean | null>;
    getUserChats(userId: string): Promise<CaptionOnly[] | null>;
}

export type IOpenAIMessageRepository = {
    create(message: OpenAIMessageDBModel): Promise<boolean | null>;
    getPlanPointUsage(plan: OpenAIPlan['id']): Promise<number | null>;
    getFreePointUsage(userId: string, fromDate: Date, toDate: Date): Promise<number | null>;
}
