import config from "./config.js";
import type { User } from "./types/entities/user.js";
import { createContainer, asClass, asValue } from "awilix";
import AIApplication from "./application/AIApplication.js";
import UserApplication from "./application/UserApplication.js";
import PlanApplication from "./application/PlanApplication.js";
import AIChatApplication from "./application/AIChatApplication.js";
import { UserTempFileCleanup } from "./jobs/UserTempFileCleanup.js";
import CacheStorage from "./infrastructure/services/CacheStorage.js";
import AIModelApplication from "./application/AIModelApplication.js";
import { errorCatcher } from "./infrastructure/proxy/errorCatcher.js";
import OpenAIService from "./infrastructure/services/OpenAIService.js";
import type * as ServiceInterfaces from "./types/contracts/services.js";
import OpenAIModelCache from "./infrastructure/services/AIModelCache.js";
import type * as RepoInterfaces from "./types/contracts/repositories.js";
import { ChatMemberCacheCleanup } from "./jobs/ChatMemberCacheCleanup.js";
import ActionLockCache from "./infrastructure/services/ActionLockCache.js";
import UserTempFileApplication from "./application/UserTempFileApplication.js";
import UserRepository from "./infrastructure/repository/mongo/UserRepository.js";
import { PlanRepository } from "./infrastructure/repository/mongo/PlanRepository.js";
import UserSubscriptionApplication from "./application/UserSubscriptionApplication.js";
import TelegramBroadcastApplication from "./application/TelegramBroadcastApplication.js";
import { PromptRepository } from "./infrastructure/repository/mongo/PromptRepository.js";
import { AIChatRepository } from "./infrastructure/repository/mongo/AIChatRepository.js";
import { AIModelRepository } from "./infrastructure/repository/mongo/AIModelRepository.js";
import { UserTempFileRepository } from "./infrastructure/repository/mongo/UserTempFileRepository.js";
import TelegramJoinRequiredChatApplication from "./application/TelegramJoinRequiredChatApplication.js";
import { MongoDBConnection, MongoDBTransaction } from "./infrastructure/repository/mongo/lib/Context.js";
import { GenerationTaskRepository } from "./infrastructure/repository/mongo/GenerationTaskRepository.js";
import { UserSubscriptionRepository } from "./infrastructure/repository/mongo/UserSubscriptionRepository.js";
import { TelegramBroadcastRepository } from "./infrastructure/repository/mongo/TelegramBroadcastRepository.js";
import { UserSubscriptionUsageRepository } from "./infrastructure/repository/mongo/UserSubscriptionUsageRepository.js";
import { TelegramJoinRequiredChatRepository } from "./infrastructure/repository/mongo/TelegramJoinRequiredChatRepository.js";

type Constants = {
    mongoDbConnectionStringUri: string;
};

type Connections = {
    databaseConnection: MongoDBConnection;
    databaseTransaction: RepoInterfaces.ITransaction;
};

type Repositories = {
    userRepository: RepoInterfaces.IUserRepository;
    userSubscriptionRepository: RepoInterfaces.IUserSubscriptionRepository;
    userSubscriptionUsageRepository: RepoInterfaces.IUserSubscriptionUsageRepository;
    planRepository: RepoInterfaces.IPlanRepository;
    aiChatRepository: RepoInterfaces.IAIChatRepository;
    aiModelRepository: RepoInterfaces.IAIModelRepository;
    promptRepository: RepoInterfaces.IPromptRepository;
    userTempFileRepository: RepoInterfaces.IUserTempFileRepository;
    generationTaskRepository: RepoInterfaces.IGenerationTaskRepository;
    telegramBroadcastRepository: RepoInterfaces.ITelegramBroadcastRepository;
    telegramJoinRequiredChatRepository: RepoInterfaces.ITelegramJoinRequiredChatRepository;
};

type Applications = {
    userApplication: UserApplication;
    userTempFileApplication: UserTempFileApplication;
    aiApplication: AIApplication;
    planApplication: PlanApplication;
    aiChatApplication: AIChatApplication;
    aiModelApplication: AIModelApplication;
    userSubscriptionApplication: UserSubscriptionApplication;
    telegramBroadcastApplication: TelegramBroadcastApplication;
    telegramJoinRequiredChatApplication: TelegramJoinRequiredChatApplication;

    fileProcessingLockCache: ServiceInterfaces.IActionLockCache<User['id']>;
    /** Cache chat members to prevent spamming Telegram */
    chatMemberCacheStorage: ServiceInterfaces.ICacheStorage<Date>;
    /** Cache manager's selected payment ID */
    selectedStaticPaymentIdCacheStorage: ServiceInterfaces.ICacheStorage<string>;
};

type Services = {
    openAI: ServiceInterfaces.IOpenAIService;
    aiModelCache: ServiceInterfaces.IAIModelCache;
    aiMessageLockCache: ServiceInterfaces.IActionLockCache<User['id']>;
    /** Lock invite calculation when it's being processed */
    calculateInviteLockCache: ServiceInterfaces.IActionLockCache<string>;
};

export type ServicesType = Constants & Connections & Repositories & Applications & Services;

export default class CoreServices {

    private readonly container = createContainer<ServicesType>({
        strict: true,
        injectionMode: "PROXY"
    });

    public get databaseConnection() {
        return this.container.cradle.databaseConnection;
    }

    public readonly applications: Applications = this.container.cradle;
    public readonly repositories: Repositories = this.container.cradle;

    #diReadyQueue = new Set<() => void>();

    async diReady(): Promise<void> {
        if (this.databaseConnection.con) return;
        const promise = new Promise<void>(resolve => this.#diReadyQueue.add(resolve));
        return promise;
    }

    async #rootInitialize() {
        const userTempFileCleanupJob = new UserTempFileCleanup(this.container.cradle.userTempFileApplication);
        const chatMemberCacheCleanup = new ChatMemberCacheCleanup(this.container.cradle.chatMemberCacheStorage);

        userTempFileCleanupJob.start();
        chatMemberCacheCleanup.start();
        this.container.cradle.aiModelRepository
            .getAll()
            .then(res => res && this.container.cradle.aiModelCache.setAll(res));
    }

    constructor(autoSetup = true) {
        this.container.register({
            mongoDbConnectionStringUri: asValue(config.mongoDbConnectionStringUri),

            databaseConnection: asClass(MongoDBConnection, { lifetime: "SINGLETON", dispose: async ctx => await ctx.closeConnection() }),
            databaseTransaction: asClass(MongoDBTransaction, { lifetime: "SCOPED", dispose: async ctx => await ctx.end() }),

            userApplication: asClass(UserApplication, { lifetime: "SCOPED" }),
            userTempFileApplication: asClass(UserTempFileApplication, { lifetime: "SCOPED" }),
            aiApplication: asClass(AIApplication, { lifetime: "SCOPED" }),
            planApplication: asClass(PlanApplication, { lifetime: "SCOPED" }),
            aiChatApplication: asClass(AIChatApplication, { lifetime: "SCOPED" }),
            aiModelApplication: asClass(AIModelApplication, { lifetime: "SCOPED" }),
            userSubscriptionApplication: asClass(UserSubscriptionApplication, { lifetime: "SCOPED" }),
            telegramBroadcastApplication: asClass(TelegramBroadcastApplication, { lifetime: "SCOPED" }),
            telegramJoinRequiredChatApplication: asClass(TelegramJoinRequiredChatApplication, { lifetime: "SCOPED" }),

            openAI: asClass(OpenAIService, { lifetime: "SINGLETON" }),
            aiModelCache: asClass(OpenAIModelCache, { lifetime: "SINGLETON" }),
            aiMessageLockCache: asClass(ActionLockCache, { lifetime: "SINGLETON" }),
            calculateInviteLockCache: asClass(ActionLockCache, { lifetime: "SINGLETON" }),
            fileProcessingLockCache: asClass(ActionLockCache, { lifetime: "SINGLETON" }),
            chatMemberCacheStorage: asClass(CacheStorage<Date>, { lifetime: "SINGLETON" }),
            selectedStaticPaymentIdCacheStorage: asClass(CacheStorage<string>, { lifetime: "SINGLETON" }),

            userRepository: asClass(errorCatcher(UserRepository), { lifetime: "SCOPED" }),
            userSubscriptionRepository: asClass(errorCatcher(UserSubscriptionRepository), { lifetime: "SCOPED" }),
            userSubscriptionUsageRepository: asClass(errorCatcher(UserSubscriptionUsageRepository), { lifetime: "SCOPED" }),
            aiModelRepository: asClass(errorCatcher(AIModelRepository), { lifetime: "SCOPED" }),
            aiChatRepository: asClass(errorCatcher(AIChatRepository), { lifetime: "SCOPED" }),
            planRepository: asClass(errorCatcher(PlanRepository), { lifetime: "SCOPED" }),
            promptRepository: asClass(errorCatcher(PromptRepository), { lifetime: "SCOPED" }),
            userTempFileRepository: asClass(errorCatcher(UserTempFileRepository), { lifetime: "SCOPED" }),
            generationTaskRepository: asClass(errorCatcher(GenerationTaskRepository), { lifetime: "SCOPED" }),
            telegramBroadcastRepository: asClass(errorCatcher(TelegramBroadcastRepository), { lifetime: "SCOPED" }),
            telegramJoinRequiredChatRepository: asClass(errorCatcher(TelegramJoinRequiredChatRepository), { lifetime: "SCOPED" }),
        });

        if (autoSetup)
            this.databaseConnection
                .connect()
                .then(() => {
                    this.#diReadyQueue.forEach(cb => cb());
                    this.#rootInitialize();
                });
    }

    createApplicationScope() {
        const scope = this.container.createScope();
        return {
            applications: scope.cradle as Applications,
            dispose: scope.dispose
        } as const;
    }

    destroy() {
        return this.container.dispose();
    }
}
