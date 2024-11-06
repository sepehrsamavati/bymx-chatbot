import config from "./config.js";
import { createContainer, asClass, asValue } from "awilix";
import UserApplication from "./application/UserApplication.js";
import { errorCatcher } from "./infrastructure/proxy/errorCatcher.js";
import type * as RepoInterfaces from "../../types/contracts/repositories.js";
import UserRepository from "./infrastructure/repository/mongo/UserRepository.js";
import { OpenAIModelRepository } from "./infrastructure/repository/mongo/OpenAIModelRepository.js";
import { MongoDBConnection, MongoDBTransaction } from "./infrastructure/repository/mongo/lib/Context.js";

type Constants = {
    mongoDbConnectionStringUri: string;
};

type Connections = {
    databaseConnection: MongoDBConnection;
    databaseTransaction: RepoInterfaces.ITransaction;
};

type Repositories = {
    userRepository: RepoInterfaces.IUserRepository;
    openAIModelRepository: RepoInterfaces.IOpenAIModelRepository;
};

type Applications = {
    userApplication: UserApplication;
};

export type ServicesType = Constants & Connections & Repositories & Applications;

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

    constructor(autoSetup = true) {
        this.container.register({
            mongoDbConnectionStringUri: asValue(config.mongoDbConnectionStringUri),

            databaseConnection: asClass(MongoDBConnection, { lifetime: "SINGLETON", dispose: async ctx => await ctx.closeConnection() }),
            databaseTransaction: asClass(MongoDBTransaction, { lifetime: "SCOPED", dispose: async ctx => await ctx.end() }),

            userApplication: asClass(UserApplication, { lifetime: "SCOPED" }),

            userRepository: asClass(errorCatcher(UserRepository), { lifetime: "SCOPED" }),
            openAIModelRepository: asClass(errorCatcher(OpenAIModelRepository), { lifetime: "SCOPED" }),
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
