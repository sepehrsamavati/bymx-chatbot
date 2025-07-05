import config from "./config.js";
import type { OTP } from "./types/entities/otp.js";
import type { User } from "./types/entities/user.js";
import { createContainer, asClass, asValue } from "awilix";
import AIApplication from "./application/AIApplication.js";
import UserApplication from "./application/UserApplication.js";
import PlanApplication from "./application/PlanApplication.js";
import AIChatApplication from "./application/AIChatApplication.js";
import GracefulShutdown from "./infrastructure/GracefulShutdown.js";
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
import TelegramOtpApplication from "./application/TelegramOtpApplication.js";
import OpenRouterService from "./infrastructure/services/OpenRouterService.js";
import EventHandlerApplication from "./application/EventHandlerApplication.js";
import UserTempFileApplication from "./application/UserTempFileApplication.js";
import UserRepository from "./infrastructure/repository/mongo/UserRepository.js";
import MetadataStoreApplication from "./application/MetadataStoreApplication.js";
import GenerationTaskApplication from "./application/GenerationTaskApplication.js";
import { TelegramApiClient } from "./infrastructure/services/TelegramApiClient.js";
import { PlanRepository } from "./infrastructure/repository/mongo/PlanRepository.js";
import ExpirableCacheStorage from "./infrastructure/services/ExpirableCacheStorage.js";
import UserSubscriptionApplication from "./application/UserSubscriptionApplication.js";
import TelegramBroadcastApplication from "./application/TelegramBroadcastApplication.js";
import { PromptRepository } from "./infrastructure/repository/mongo/PromptRepository.js";
import { AIChatRepository } from "./infrastructure/repository/mongo/AIChatRepository.js";
import { AIModelRepository } from "./infrastructure/repository/mongo/AIModelRepository.js";
import { UserTempFileRepository } from "./infrastructure/repository/mongo/UserTempFileRepository.js";
import { MetadataStoreRepository } from "./infrastructure/repository/mongo/MetadataStoreRepository.js";
import TelegramJoinRequiredChatApplication from "./application/TelegramJoinRequiredChatApplication.js";
import { MongoDBConnection, MongoDBTransaction } from "./infrastructure/repository/mongo/lib/Context.js";
import { GenerationTaskRepository } from "./infrastructure/repository/mongo/GenerationTaskRepository.js";
import { UserSubscriptionRepository } from "./infrastructure/repository/mongo/UserSubscriptionRepository.js";
import { TelegramBroadcastRepository } from "./infrastructure/repository/mongo/TelegramBroadcastRepository.js";
import { UserSubscriptionUsageRepository } from "./infrastructure/repository/mongo/UserSubscriptionUsageRepository.js";
import { TelegramJoinRequiredChatRepository } from "./infrastructure/repository/mongo/TelegramJoinRequiredChatRepository.js";

type Constants = {
    projectName: string;
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
    metadataStoreRepository: RepoInterfaces.IMetadataStoreRepository;
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
    telegramOtpApplication: TelegramOtpApplication;
    eventHandlerApplication: EventHandlerApplication;
    metadataStoreApplication: MetadataStoreApplication;
    generationTaskApplication: GenerationTaskApplication;
    userSubscriptionApplication: UserSubscriptionApplication;
    telegramBroadcastApplication: TelegramBroadcastApplication;
    telegramJoinRequiredChatApplication: TelegramJoinRequiredChatApplication;

    gracefulShutdown: GracefulShutdown;
    fileProcessingLockCache: ServiceInterfaces.IActionLockCache<User['id']>;
    /** Cache chat members to prevent spamming Telegram */
    chatMemberCacheStorage: ServiceInterfaces.ICacheStorage<Date>;
    /** Cache manager's selected payment ID */
    selectedStaticPaymentIdCacheStorage: ServiceInterfaces.ICacheStorage<string>;
};

type Services = {
    openAI: ServiceInterfaces.IOpenAIService;
    otpCache: ServiceInterfaces.IExpirableCacheStorage<ServiceInterfaces.ExpirableEntity<OTP>, OTP>;
    // memoryCandidateCache: ServiceInterfaces.ICacheStorage<string[]>;
    openRouter: ServiceInterfaces.IOpenRouterService;
    aiModelCache: ServiceInterfaces.IAIModelCache;
    aiMessageLockCache: ServiceInterfaces.IActionLockCache<User['id']>;
    /** Lock invite calculation when it's being processed */
    calculateInviteLockCache: ServiceInterfaces.IActionLockCache<string>;
};

type ExposedServices = {
    telegramApiClient: TelegramApiClient;
}

export type ServicesType = Constants & Connections & Repositories & Applications & Services & ExposedServices;

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
    /** Requires DI ready */
    public exposedServices!: Readonly<ExposedServices>;

    #diReadyQueue = new Set<() => void>([
        () => {
            this.exposedServices = Object.freeze({
                telegramApiClient: this.container.cradle.telegramApiClient,
            });
        }
    ]);

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
            projectName: asValue("core"),
            mongoDbConnectionStringUri: asValue(config.mongoDbConnectionStringUri),

            databaseConnection: asClass(MongoDBConnection, { lifetime: "SINGLETON", dispose: async ctx => await ctx.closeConnection() }),
            databaseTransaction: asClass(MongoDBTransaction, { lifetime: "SCOPED", dispose: async ctx => await ctx.end() }),

            userApplication: asClass(UserApplication, { lifetime: "SCOPED" }),
            userTempFileApplication: asClass(UserTempFileApplication, { lifetime: "SCOPED" }),
            aiApplication: asClass(AIApplication, { lifetime: "SCOPED" }),
            planApplication: asClass(PlanApplication, { lifetime: "SCOPED" }),
            aiChatApplication: asClass(AIChatApplication, { lifetime: "SCOPED" }),
            aiModelApplication: asClass(AIModelApplication, { lifetime: "SCOPED" }),
            telegramOtpApplication: asClass(TelegramOtpApplication, { lifetime: "SCOPED" }),
            eventHandlerApplication: asClass(EventHandlerApplication, { lifetime: "SCOPED" }),
            metadataStoreApplication: asClass(MetadataStoreApplication, { lifetime: "SCOPED" }),
            generationTaskApplication: asClass(GenerationTaskApplication, { lifetime: "SCOPED" }),
            userSubscriptionApplication: asClass(UserSubscriptionApplication, { lifetime: "SCOPED" }),
            telegramBroadcastApplication: asClass(TelegramBroadcastApplication, { lifetime: "SCOPED" }),
            telegramJoinRequiredChatApplication: asClass(TelegramJoinRequiredChatApplication, { lifetime: "SCOPED" }),

            gracefulShutdown: asValue(GracefulShutdown.getInstance()),

            openAI: asClass(OpenAIService, { lifetime: "SINGLETON" }),
            openRouter: asClass(OpenRouterService, { lifetime: "SINGLETON" }),
            aiModelCache: asClass(OpenAIModelCache, { lifetime: "SINGLETON" }),
            aiMessageLockCache: asClass(ActionLockCache, { lifetime: "SINGLETON" }),
            calculateInviteLockCache: asClass(ActionLockCache, { lifetime: "SINGLETON" }),
            fileProcessingLockCache: asClass(ActionLockCache, { lifetime: "SINGLETON" }),
            otpCache: asClass(ExpirableCacheStorage<ServiceInterfaces.ExpirableEntity<OTP>, OTP>, { lifetime: "SINGLETON" }),
            // memoryCandidateCache: asClass(CacheStorage<string[]>, { lifetime: "SINGLETON" }),
            chatMemberCacheStorage: asClass(CacheStorage<Date>, { lifetime: "SINGLETON" }),
            selectedStaticPaymentIdCacheStorage: asClass(CacheStorage<string>, { lifetime: "SINGLETON" }),
            telegramApiClient: asClass(TelegramApiClient, { lifetime: "SINGLETON" }),

            userRepository: asClass(errorCatcher(UserRepository), { lifetime: "SCOPED" }),
            userSubscriptionRepository: asClass(errorCatcher(UserSubscriptionRepository), { lifetime: "SCOPED" }),
            userSubscriptionUsageRepository: asClass(errorCatcher(UserSubscriptionUsageRepository), { lifetime: "SCOPED" }),
            aiModelRepository: asClass(errorCatcher(AIModelRepository), { lifetime: "SCOPED" }),
            aiChatRepository: asClass(errorCatcher(AIChatRepository), { lifetime: "SCOPED" }),
            planRepository: asClass(errorCatcher(PlanRepository), { lifetime: "SCOPED" }),
            promptRepository: asClass(errorCatcher(PromptRepository), { lifetime: "SCOPED" }),
            userTempFileRepository: asClass(errorCatcher(UserTempFileRepository), { lifetime: "SCOPED" }),
            metadataStoreRepository: asClass(errorCatcher(MetadataStoreRepository), { lifetime: "SCOPED" }),
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

    createApplicationScope(opts?: {
        projectName?: string;
    }) {
        const scope = this.container.createScope();

        if (opts?.projectName)
            scope.register({
                projectName: asValue(opts.projectName)
            });

        return {
            applications: scope.cradle as Applications,
            dispose: scope.dispose,
        } as const;
    }

    destroy() {
        return this.container.dispose();
    }
}
