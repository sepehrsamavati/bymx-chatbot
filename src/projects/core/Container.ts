import config from "./config.js";
import { createContainer, asClass, asValue } from "awilix";
import UserApplication from "./application/UserApplication.js";
import OpenAIApplication from "./application/OpenAIApplication.js";
import { errorCatcher } from "./infrastructure/proxy/errorCatcher.js";
import OpenAIService from "./infrastructure/services/OpenAIService.js";
import OpenAIPlanApplication from "./application/OpenAIPlanApplication.js";
import type * as ServiceInterfaces from "../../types/contracts/services.js";
import type * as RepoInterfaces from "../../types/contracts/repositories.js";
import OpenAIModelCache from "./infrastructure/services/OpenAIModelCache.js";
import UserRepository from "./infrastructure/repository/mongo/UserRepository.js";
import { OpenAIChatRepository } from "./infrastructure/repository/mongo/OpenAIChatRepository.js";
import { OpenAIPlanRepository } from "./infrastructure/repository/mongo/OpenAIPlanRepository.js";
import { OpenAIModelRepository } from "./infrastructure/repository/mongo/OpenAIModelRepository.js";
import { OpenAIMessageRepository } from "./infrastructure/repository/mongo/OpenAIMessageRepository.js";
import { MongoDBConnection, MongoDBTransaction } from "./infrastructure/repository/mongo/lib/Context.js";
import { UserSubscriptionRepository } from "./infrastructure/repository/mongo/UserSubscriptionRepository.js";

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
    openAIPlanRepository: RepoInterfaces.IOpenAIPlanRepository;
    openAIChatRepository: RepoInterfaces.IOpenAIChatRepository;
    openAIModelRepository: RepoInterfaces.IOpenAIModelRepository;
    openAIMessageRepository: RepoInterfaces.IOpenAIMessageRepository;
};

type Applications = {
    userApplication: UserApplication;
    openAIApplication: OpenAIApplication;
    openAIPlanApplication: OpenAIPlanApplication;
};

type Services = {
    openAI: ServiceInterfaces.IOpenAIService;
    openAIModelCache: ServiceInterfaces.IOpenAIModelCache;
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
    public readonly services: Services = this.container.cradle;

    #diReadyQueue = new Set<() => void>();

    async diReady(): Promise<void> {
        if (this.databaseConnection.con) return;
        const promise = new Promise<void>(resolve => this.#diReadyQueue.add(resolve));
        return promise;
    }

    constructor(autoSetup = true) {
        this.container.register({
            mongoDbConnectionStringUri: asValue(config.mongoDbConnectionStringUri),

            databaseConnection: asClass(MongoDBConnection, { lifetime: "SINGLETON", dispose: async ctx => await ctx.closeConnection() }),
            databaseTransaction: asClass(MongoDBTransaction, { lifetime: "SCOPED", dispose: async ctx => await ctx.end() }),

            userApplication: asClass(UserApplication, { lifetime: "SCOPED" }),
            openAIApplication: asClass(OpenAIApplication, { lifetime: "SCOPED" }),
            openAIPlanApplication: asClass(OpenAIPlanApplication, { lifetime: "SCOPED" }),

            openAI: asClass(OpenAIService, { lifetime: "SINGLETON" }),
            openAIModelCache: asClass(OpenAIModelCache, { lifetime: "SCOPED" }),

            userRepository: asClass(errorCatcher(UserRepository), { lifetime: "SCOPED" }),
            userSubscriptionRepository: asClass(errorCatcher(UserSubscriptionRepository), { lifetime: "SCOPED" }),
            openAIModelRepository: asClass(errorCatcher(OpenAIModelRepository), { lifetime: "SCOPED" }),
            openAIChatRepository: asClass(errorCatcher(OpenAIChatRepository), { lifetime: "SCOPED" }),
            openAIPlanRepository: asClass(errorCatcher(OpenAIPlanRepository), { lifetime: "SCOPED" }),
            openAIMessageRepository: asClass(errorCatcher(OpenAIMessageRepository), { lifetime: "SCOPED" }),
        });

        if (autoSetup)
            this.databaseConnection
                .connect()
                .then(() => {
                    this.#diReadyQueue.forEach(cb => cb());
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
