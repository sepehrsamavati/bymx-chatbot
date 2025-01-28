import type { AIModel } from "../entities/aiModel";
import type { Plan, SearchPlan } from "../entities/plan";
import type { CaptionOnly, FlattenToIDs } from "./entities";
import type { PromptBasicInfo, PromptDBModel } from "../entities/prompt";
import type { CreateUserSubscriptionUsage } from "../entities/userSubscriptionUsage";
import type { AIChat, AIChatDBModel, SearchAIChat, UpdateAIChat } from "../entities/aiChat";
import type { User, UserDBModel, CreateUserModel, UpdateUserModel, SearchUserModel } from "../entities/user";
import type { CreateUserTempFile, SearchUserTempFile, UpdateUserTempFile, UserTempFile } from "../entities/userTempFile";
import type { GenerationTask, GenerationTaskDBModel, SearchGenerationTaskModel, UpdateGenerationTaskModel } from "../entities/generationTask";
import type { CreateTelegramBroadcast, SearchTelegramBroadcast, TelegramBroadcast, UpdateTelegramBroadcast } from "../entities/telegramBroadcast";
import type { CreateUserSubscription, SearchUserSubscription, UpdateUserSubscription, UserSubscription, UserSubscriptionDBModel } from "../entities/userSubscription";
import type { SearchTelegramJoinRequiredChat, TelegramJoinRequiredChat, CreateTelegramJoinRequiredChat, UpdateTelegramJoinRequiredChat } from "../entities/telegramJoinRequiredChat";

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

    /** Returns users that created recently (`insertDate` sorted) */
    getRecentlyInserted(count: number): Promise<User[] | null>;

    /** Returns number of users that created after target date */
    countRecentlyInserted(fromDate: Date): Promise<number | null>;

    /** Similar to `getBy` but updates `username`, `lastActivity` and increases `usage` */
    getAndUpdate(update: UpdateUserModel, ...args: Parameters<IUserRepository['getBy']>): ReturnType<IUserRepository['getBy']>;

    /** Update user partially */
    update(id: UserDBModel['id'], update: UpdateUserModel): Promise<{ ok: boolean; } | null>;

    /** Count all users (no filter | deleted, blocked, ...) */
    countAll(): Promise<number | null>;

    /** Returns list of Telegram IDs */
    getTgIds(filter: SearchUserModel): Promise<number[] | null>;

    /** Returns list of Telegram IDs */
    increaseInviteCount(filter: SearchUserModel, amount: number): Promise<boolean | null>;
}

export type IUserSubscriptionRepository = {
    create(userSubscription: CreateUserSubscription): Promise<string | null>;
    updateById(userSubscription: UpdateUserSubscription): Promise<boolean | null>;
    getAllActive(userId: User['id'], expiryNotBefore: Date): Promise<Omit<UserSubscription, 'user'>[] | null>;
    getById(id: string): Promise<UserSubscriptionDBModel | null>;
    getMany(filter: SearchUserSubscription): Promise<Omit<UserSubscription, 'user'>[] | null>;
    count(filter: SearchUserSubscription): Promise<number | null>;
}

export type IUserSubscriptionUsageRepository = {
    createMany(userSubscriptionUsages: CreateUserSubscriptionUsage[]): Promise<string[] | null>;
    getPointUsageById(userSubscriptionId: UserSubscription['id']): Promise<number | null>;
    getPointUsageByIds(userSubscriptionIds: UserSubscription['id'][]): Promise<{ userSubscriptionId: string; amount: number; }[] | null>;
}

export type ITelegramBroadcastRepository = {
    create(telegramBroadcast: CreateTelegramBroadcast): Promise<boolean | null>;
    getById(id: string): Promise<TelegramBroadcast | null>;
    getOne(filter: SearchTelegramBroadcast): Promise<TelegramBroadcast | null>;
    updateById(update: UpdateTelegramBroadcast): Promise<boolean | null>;
    deletePendingUser(id: string, tgId: User['tgId'], increaseOkCount: boolean): Promise<boolean | null>;
    delete(id: string, endDate?: Date): Promise<boolean | null>;
}

export type IUserTempFileRepository = {
    create(userTempFile: CreateUserTempFile): Promise<boolean | null>;
    /** Gets entity and updates `lastAccessed` property */
    get(filter: SearchUserTempFile): Promise<Omit<UserTempFile, 'user'> | null>;
    getInactive(lastAccessedLowerThan: Date, limit: number): Promise<Omit<UserTempFile, 'user'>[] | null>;
    updateById(update: UpdateUserTempFile): Promise<boolean | null>;
    countUserUsage(userId: string, fromDate: Date): Promise<number | null>;
}

export type IAIModelRepository = {
    getAll(): Promise<AIModel[] | null>;
    getById(id: AIModel['id']): Promise<AIModel | null>;
    exists(id: AIModel['id']): Promise<boolean | null>;
}

export type IPlanRepository = {
    getById(id: Plan['id']): Promise<Plan | null>;
    getMany(filter: SearchPlan): Promise<Plan[] | null>;
}

export type IAIChatRepository = {
    create(chat: Omit<AIChatDBModel, 'id'>): Promise<AIChatDBModel['id'] | null>;
    updateById(update: UpdateAIChat): Promise<boolean | null>;
    getChat(filter: SearchAIChat): Promise<Omit<AIChat, 'user'> | null>;
    exists(userId: string): Promise<boolean | null>;
    getChats(filter: SearchAIChat): Promise<CaptionOnly[] | null>;
    count(filter: SearchAIChat): Promise<number | null>;
}

export type IPromptRepository = {
    create(message: FlattenToIDs<PromptDBModel, 'usages'>): Promise<boolean | null>;
    getUsage(fromDate: Date, toDate: Date): Promise<{ count: number; point: number; cost: number; } | null>;
    getRecentHistory(chatId: string, count: number): Promise<PromptBasicInfo[] | null>;
    countUserFileUsage(userId: string, fromDate: Date): Promise<number | null>;
    deleteByChatId(chatId: string): Promise<boolean | null>;
}

export type ITelegramJoinRequiredChatRepository = {
    create(chat: CreateTelegramJoinRequiredChat): Promise<boolean | null>;
    getOne(filter: SearchTelegramJoinRequiredChat): Promise<TelegramJoinRequiredChat | null>;
    getMany(filter: SearchTelegramJoinRequiredChat): Promise<TelegramJoinRequiredChat[] | null>;
    updateOne(update: UpdateTelegramJoinRequiredChat): Promise<boolean | null>;
}

export type IGenerationTaskRepository = {
    create(task: FlattenToIDs<GenerationTaskDBModel, 'user' | 'model' | 'usages'>): Promise<boolean | null>;
    count(filter: FlattenToIDs<SearchGenerationTaskModel, 'user' | 'model'>): Promise<number | null>;
    getOne(filter: FlattenToIDs<SearchGenerationTaskModel, 'user' | 'model'>): Promise<GenerationTask | null>;
    getMany(filter: FlattenToIDs<SearchGenerationTaskModel, 'user' | 'model'>): Promise<GenerationTask[] | null>;
    updateOne(filter: Pick<GenerationTask, 'internalId'>, update: UpdateGenerationTaskModel): Promise<boolean | null>;
    updateMany(filter: FlattenToIDs<SearchGenerationTaskModel, 'user' | 'model'>, update: UpdateGenerationTaskModel): Promise<boolean | null>;
}
