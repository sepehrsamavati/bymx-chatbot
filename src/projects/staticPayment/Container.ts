import config from "../core/config.js";
import { createContainer, asClass, asValue } from "awilix";
import PaymentApplication from "./application/PaymentApplication.js";
import type * as RepoInterfaces from "./types/contracts/repositories.js";
import type * as ServiceInterfaces from "../../types/contracts/services.js";
import type * as CoreRepoInterfaces from "../../types/contracts/repositories.js";
import ActionLockCache from "../core/infrastructure/services/ActionLockCache.js";
import { MongoDBConnection } from "./infrastructure/repository/mongo/lib/Context.js";
import { PaymentRepository } from "./infrastructure/repository/mongo/PaymentRepository.js";
import { MongoDBTransaction } from "../core/infrastructure/repository/mongo/lib/Context.js";

type Constants = {
    mongoDbConnectionStringUri: string;
};

type Connections = {
    databaseConnection: MongoDBConnection;
    databaseTransaction: CoreRepoInterfaces.ITransaction;
};

type Repositories = {
    paymentRepository: RepoInterfaces.IPaymentRepository;
};

type Applications = {
    paymentApplication: PaymentApplication;
};

type Services = {
    paymentLockCache: ServiceInterfaces.IActionLockCache<string>;
};

export type PaymentServicesType = Constants & Connections & Repositories & Applications & Services;

export default class PaymentServices {

    private readonly container = createContainer<PaymentServicesType>({
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

            paymentApplication: asClass(PaymentApplication, { lifetime: "SCOPED" }),

            paymentLockCache: asClass(ActionLockCache, { lifetime: "SINGLETON" }),

            paymentRepository: asClass(PaymentRepository, { lifetime: "SCOPED" }),
        });

        if (autoSetup)
            this.databaseConnection
                .connect()
                .then(() => {
                    this.#diReadyQueue.forEach(cb => cb());
                });
    }

    destroy() {
        return this.container.dispose();
    }
}
