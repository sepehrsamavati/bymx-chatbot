import * as dotenv from "dotenv";
import configError from "./helpers/configError.js";

dotenv.config();

const config = {
    alwaysConsoleLog: false,
    isDevelopment: process.env.NODE_ENV !== "production",
    mongoDbConnectionStringUri: process.env.BYMX_MONGO_URI ?? "",
    telegramBotToken: process.env.BYMX_TG_BOT_TOKEN ?? "",
    openAI: {
        apiToken: process.env.BYMX_OPEN_AI_API_TOKEN ?? "",
        defaultModelId: process.env.BYMX_OPEN_AI_DEFAULT_MODEL_ID ?? ""
    },
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

configError(
    "Open AI API token not defined",
    !config.openAI.apiToken
);

export default config;
