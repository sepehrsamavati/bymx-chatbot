import mongoose from "mongoose";
import MongooseModels from "./MongooseModels.js";
import { logger } from "../../../../../../../helpers/logger.js";
import type { PaymentServicesType } from "../../../../Container.js";

export class MongoDBConnection {
    #mongoDbConnectionStringUri: string;

    constructor(container: PaymentServicesType) {
        this.#mongoDbConnectionStringUri = container.mongoDbConnectionStringUri;
        mongoose.set('strictQuery', true);
    }

    #_con: mongoose.Connection | null = null;
    public get con() {
        return this.#_con as NonNullable<mongoose.Connection>;
    }

    async connect() {
        const connection = this.#_con = await mongoose.createConnection(this.#mongoDbConnectionStringUri).asPromise();
        logger.info("MongoDB connection established (staticPayment).");
        this.#mongooseModels = new MongooseModels(connection);
        return connection;
    }

    async closeConnection(): Promise<void> {
        await this.con?.close(false);
        logger.info("MongoDB connection closed (staticPayment).");
        return;
    }

    #mongooseModels?: MongooseModels;

    get models() {
        return this.#mongooseModels?.models as NonNullable<MongooseModels['models']>;
    }
}