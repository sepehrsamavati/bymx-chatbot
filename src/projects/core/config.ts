import * as dotenv from "dotenv";
import configError from "./helpers/configError.js";

dotenv.config();

const config = {
    alwaysConsoleLog: false,
    isDevelopment: process.env.NODE_ENV !== "production",
    mongoDbConnectionStringUri: process.env.BYMX_MONGO_URI ?? "",
    telegramBotToken: process.env.BYMX_TG_BOT_TOKEN ?? "",
    log: {
        disable: process.argv.includes("--silent-logger"),
        maxLogSize: 10 * 1024 * 1024,
        maxLogFiles: 10
    }
};

Object.freeze(config);

configError(
    "MongoDB connection string not defined",
    !config.mongoDbConnectionStringUri
);

configError(
    "Telegram bot API token not defined",
    !config.telegramBotToken
);

export default config;
