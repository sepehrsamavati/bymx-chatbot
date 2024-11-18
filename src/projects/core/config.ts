import fs from "node:fs";
import * as dotenv from "dotenv";
import configError from "./helpers/configError.js";

dotenv.config();

const config = {
    alwaysConsoleLog: false,
    isDevelopment: process.env.NODE_ENV !== "production",
    mongoDbConnectionStringUri: process.env.BYMX_MONGO_URI ?? "",
    telegramBotToken: process.env.BYMX_TG_BOT_TOKEN ?? "",
    chatCountLimit: 5,
    cacheDirectory: process.env.BYMX_CACHE_STORAGE ?? "./data/cache",
    dailyFreePoints: Number.parseInt(process.env.BYMX_DAILY_FREE_POINTS ?? "0"),
    openAI: {
        apiToken: process.env.BYMX_OPEN_AI_API_TOKEN ?? "",
        defaultModelId: process.env.BYMX_OPEN_AI_DEFAULT_MODEL_ID ?? "",
        feePercentage: Number(process.env.BYMX_FEE_PERCENTAGE || "0")
    },
    log: {
        disable: process.argv.includes("--silent-logger"),
        maxLogSize: 10 * 1024 * 1024,
        maxLogFiles: 10
    }
};

Object.freeze(config);

if (!fs.existsSync(config.cacheDirectory))
    fs.mkdirSync(config.cacheDirectory, { recursive: true });

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

configError(
    "Fee percentage is invalid (0-100 range)",
    Number.isNaN(config.openAI.feePercentage)
);

configError(
    "Daily free points value is not a number",
    Number.isNaN(config.dailyFreePoints)
);

export default config;
