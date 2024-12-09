import fs from "node:fs";
import * as dotenv from "dotenv";
import configError from "./helpers/configError.js";
import { setGlobalDispatcher, ProxyAgent } from "undici";

dotenv.config();

const config = {
    alwaysConsoleLog: false,
    isDevelopment: process.env.NODE_ENV !== "production",
    mongoDbConnectionStringUri: process.env.BYMX_MONGO_URI ?? "",
    telegramBotToken: process.env.BYMX_TG_BOT_TOKEN ?? "",
    staticPaymentReceiptTgChatId: process.env.BYMX_STATIC_PAYMENT_TG_RECEIPT_CHAT_ID ?? "",
    chatCountLimit: 5,
    cacheDirectory: process.env.BYMX_CACHE_STORAGE ?? "./data/cache",
    activeSubscriptionLimit: Number.parseInt(process.env.BYMX_ACTIVE_SUBSCRIPTION_LIMIT ?? "5"),
    dailyFreePoints: Number.parseInt(process.env.BYMX_DAILY_FREE_POINTS ?? "0"),
    /** Minutes */
    tempFileCleanupAge: Number.parseInt(process.env.BYMX_FILE_CLEANUP_AGE ?? "5"),
    httpProxyUri: process.env.BYMX_HTTP_PROXY ? new URL(process.env.BYMX_HTTP_PROXY).toString() : undefined,
    usdToIrtMultiplier: Number.parseInt(process.env.BYMX_PRICE_USD_TO_IRT_MULTIPLIER ?? "0"),
    fileUploadLimit: {
        /** Minutes */
        timePeriod: Number.parseInt(process.env.BYMX_FILE_UPLOAD_LIMIT_PERIOD ?? "20"),
        count: Number.parseInt(process.env.BYMX_FILE_UPLOAD_LIMIT_COUNT ?? "3"),
    },
    fileProcessingLimit: {
        /** Minutes */
        timePeriod: Number.parseInt(process.env.BYMX_FILE_PROCESSING_LIMIT_PERIOD ?? "30"),
        count: Number.parseInt(process.env.BYMX_FILE_PROCESSING_LIMIT_COUNT ?? "10"),
    },
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

configError(
    "File cleanup (minute) is not a valid positive number (>= 1)",
    Number.isNaN(config.tempFileCleanupAge) || config.tempFileCleanupAge < 1
);

configError(
    "File uploading limit 'time period'/'count' is not a valid positive number",
    Number.isNaN(config.fileUploadLimit.count) || Number.isNaN(config.fileUploadLimit.timePeriod)
    || config.fileUploadLimit.timePeriod < 0 || config.fileUploadLimit.count < 0
);

configError(
    "File processing limit 'time period'/'count' is not a valid positive number",
    Number.isNaN(config.fileProcessingLimit.count) || Number.isNaN(config.fileProcessingLimit.timePeriod)
    || config.fileProcessingLimit.timePeriod < 0 || config.fileProcessingLimit.count < 0
);

configError(
    `USD to IRT multiplier is not valid (${config.usdToIrtMultiplier})`,
    Number.isNaN(config.usdToIrtMultiplier) || config.usdToIrtMultiplier <= 0
);

configError(
    "Define receipt chat ID for static payments",
    !config.staticPaymentReceiptTgChatId
);

configError(
    `Invalid value for active subscriptions limit (${config.activeSubscriptionLimit}) / Should be an integer in range 1-2000`,
    Number.isNaN(config.activeSubscriptionLimit) || config.activeSubscriptionLimit < 1 || config.activeSubscriptionLimit > 2000
);

if (!fs.existsSync(config.cacheDirectory))
    fs.mkdirSync(config.cacheDirectory, { recursive: true });

if (config.httpProxyUri) {
    // Corporate proxy uses CA not in undici's certificate store
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const dispatcher = new ProxyAgent({ uri: config.httpProxyUri });
    setGlobalDispatcher(dispatcher);
}

export default config;
