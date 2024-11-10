import mongoose from "mongoose";
import { logger } from "../../../../helpers/logger.js";
import { userModelDefinition } from "../models/User.js";
import type { ServicesType } from "../../../../Container.js";
import { openAIPlanModelDefinition } from "../models/OpenAIPlan.js";
import { openAIChatModelDefinition } from "../models/OpenAIChat.js";
import { openAIModelModelDefinition } from "../models/OpenAIModel.js";
import { openAIMessageModelDefinition } from "../models/OpenAIMessage.js";
import type { ITransaction } from "../../../../../../types/contracts/repositories.js";
import { userSubscriptionModelDefinition } from "../models/UserSubscription.js";

export class MongoDBTransaction implements ITransaction {
    #session: mongoose.ClientSession | null = null;
    #connection;

    get session() {
        return this.#session;
    }

    constructor(container: ServicesType) {
        this.#connection = container.databaseConnection.con;
    }

    async start() {
        try {
            if (this.#session) {
                logger.warn("MongoDB transaction start request was made while another session already exists.");
                return false;
            }

            const session = await this.#connection.startSession();

            if (this.#session) {
                logger.warn("MongoDB transaction session started while another session already exists.");
                await session.endSession();
                return false;
            }

            this.#session = session;
            this.#session.startTransaction();
            return true;
        } catch (err) {
            logger.error("MongoDB transaction (session) start error, " + (err instanceof Error ? err.message : err));
            return false;
        }
    }

    async commit() {
        try {
            if (!this.#session)
                return false;
            await this.#session.commitTransaction();
            await this.end();
            return true;
        } catch (err) {
            logger.error("MongoDB transaction commit error, " + (err instanceof Error ? err.message : err));
            return false;
        }
    }

    async rollback() {
        try {
            if (!this.#session)
                return false;
            await this.#session.abortTransaction();
            await this.end();
            return true;
        } catch (err) {
            logger.error("MongoDB transaction rollback error, " + (err instanceof Error ? err.message : err));
            return false;
        }
    }

    async end() {
        try {
            if (!this.#session)
                return false;
            await this.#session.endSession();
            this.#session = null;
            return true;
        } catch (err) {
            logger.error("MongoDB transaction (session) end error, " + (err instanceof Error ? err.message : err));
            return false;
        }
    }
}

export abstract class Transactional {
    readonly transaction;

    constructor(container: ServicesType) {
        const transaction = container.databaseTransaction;
        if (transaction instanceof MongoDBTransaction) {
            this.transaction = transaction;
        } else {
            throw new TypeError("DI container transaction is not MongoDB transaction!");
        }
    }
}

export class MongoDBConnection {
    #mongoDbConnectionStringUri: string;

    constructor(container: ServicesType) {
        this.#mongoDbConnectionStringUri = container.mongoDbConnectionStringUri;
        mongoose.set('strictQuery', true);
    }

    #_con: mongoose.Connection | null = null;
    public get con() {
        return this.#_con as NonNullable<mongoose.Connection>;
    }

    async connect() {
        const connection = this.#_con = await mongoose.createConnection(this.#mongoDbConnectionStringUri).asPromise();
        logger.info("MongoDB connection established.");
        this.#mongooseModels = new MongooseModels(connection);
        return connection;
    }

    async closeConnection(): Promise<void> {
        await this.con?.close(false);
        logger.info("MongoDB connection closed.");
        return;
    }


    #mongooseModels?: MongooseModels;

    get models() {
        return this.#mongooseModels?.models as NonNullable<MongooseModels['models']>;
    }
}

class MongooseModels {
    readonly models;

    constructor(private connection: mongoose.Connection) {
        this.models = Object.freeze({
            user: userModelDefinition.createModel(this.connection),
            userSubscription: userSubscriptionModelDefinition.createModel(this.connection),
            openAIModel: openAIModelModelDefinition.createModel(this.connection),
            openAIPlan: openAIPlanModelDefinition.createModel(this.connection),
            openAIChat: openAIChatModelDefinition.createModel(this.connection),
            openAIMessage: openAIMessageModelDefinition.createModel(this.connection),
        });
    }
}
