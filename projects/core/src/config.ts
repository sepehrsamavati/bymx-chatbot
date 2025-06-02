import fs from "node:fs";
import * as dotenv from "dotenv";
import { bymx } from "./helpers/asciiArt.js";
import configError from "./helpers/configError.js";
import { setGlobalDispatcher, ProxyAgent } from "undici";
import { projectVersion, projectsVersions } from "./helpers/configVersion.js";

dotenv.config({
    path: [
        ".env",
        "../core/.env",
        "../.env",
        "../../.env",
        "../../../.env",
    ]
});

const isDevelopment = process.env.NODE_ENV !== "production";

if (isDevelopment)
    console.debug(
        `\n${bymx}`
        + `\n v${projectVersion}`
        + `\n\n${projectsVersions.map(info => `${`${info.project.toUpperCase()}:`.padEnd(15, ' ')} v${info.version}`).join('\n')}\n`
    );

const config = {
    version: projectVersion,
    alwaysConsoleLog: false,
    isDevelopment: isDevelopment,
    mongoDbConnectionStringUri: process.env.BYMX_MONGO_URI ?? "",
    chatCountLimit: 100,
    storageBasePath: process.env.BYMX_STORAGE_BASE_PATH ?? "./data/cache",
    activeSubscriptionLimit: Number.parseInt(process.env.BYMX_ACTIVE_SUBSCRIPTION_LIMIT ?? "5"),
    dailyFreePoints: Number.parseInt(process.env.BYMX_DAILY_FREE_POINTS ?? "0"),
    /** Minutes */
    tempFileCleanupAge: Number.parseInt(process.env.BYMX_FILE_CLEANUP_AGE ?? "5"),
    httpProxyUri: process.env.BYMX_HTTP_PROXY ? new URL(process.env.BYMX_HTTP_PROXY).toString() : undefined,
    usdToIrtMultiplier: Number.parseInt(process.env.BYMX_PRICE_USD_TO_IRT_MULTIPLIER ?? "0"),
    ffmpegPath: process.env.BYMX_FFMPEG_PATH ?? "",
    ffprobePath: process.env.BYMX_FFPROBE_PATH ?? "",
    feePercentage: Number(process.env.BYMX_FEE_PERCENTAGE || "0"),
    telegram: {
        apiToken: process.env.BYMX_TG_BOT_TOKEN ?? "",
        supportAccountUsername: process.env.BYMX_TELEGRAM_SUPPORT_ACCOUNT ?? "",
        staticPaymentReceiptChatId: process.env.BYMX_STATIC_PAYMENT_TG_RECEIPT_CHAT_ID ?? "",
    },
    apiServer: {
        domain: "",
        port: Number.parseInt(process.env.BYMX_API_SERVER_PORT ?? "3017"),
        baseAddress: process.env.BYMX_API_SERVER_BASE_ADDRESS ?? "",
        cookieKey: "Auth",
        accessTokenCookieKey: "access_token",
        refreshTokenCookieKey: "refresh_token",
        sessionSecretHexKey: process.env.BYMX_API_SERVER_SESSION_COOKIE_SIGN_KEY || "",
        tokenSignSecret: process.env.BYMX_API_SERVER_COOKIE_SIGN_SECRET || "",
    },
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
    falAI: {
        apiToken: process.env.BYMX_FAL_API_KEY ?? "",
    },
    openAiClient: {
        retries: 2,
        timeout: 60e3,
    },
    openAI: {
        apiToken: process.env.BYMX_OPEN_AI_API_TOKEN ?? "",
        freeModelId: process.env.BYMX_OPEN_AI_FREE_MODEL_ID ?? "",
        lowCostModelId: process.env.BYMX_OPEN_AI_LOW_COST_MODEL_ID ?? "",
        defaultModelId: process.env.BYMX_OPEN_AI_DEFAULT_MODEL_ID ?? "",
        /** @deprecated */
        feePercentage: Number(process.env.BYMX_FEE_PERCENTAGE || "0")
    },
    openRouter: {
        apiToken: process.env.BYMX_OPEN_ROUTER_API_TOKEN ?? "",
    },
    log: {
        disable: process.argv.includes("--silent-logger"),
        maxLogSize: 10 * 1024 * 1024,
        maxLogFiles: 10
    }
};

configError(
    "API server base address is not defined/valid URL",
    !URL.canParse(config.apiServer.baseAddress)
);

config.apiServer.domain = config.isDevelopment ? 'localhost' : new URL(config.apiServer.baseAddress).host;

// Freeze Start
for (const key of Object.keys(config)) {
    const value = config[key as keyof typeof config];
    if (value && typeof value === "object")
        Object.freeze(value);
}

Object.freeze(config);
// Freeze End

configError(
    "API server port is not valid (1-65535 integer range)",
    !Number.isInteger(config.apiServer.port) || config.apiServer.port <= 0 || config.apiServer.port > 65535
);

configError(
    "API server cookie/token sign secret is not defined",
    !config.apiServer.tokenSignSecret
);

configError(
    "MongoDB connection string not defined",
    !config.mongoDbConnectionStringUri
);

configError(
    "Telegram bot API token not defined",
    !config.telegram.apiToken
);

configError(
    "Open Router API token not defined",
    !config.openRouter.apiToken
);

configError(
    "Open AI API token not defined",
    !config.openAI.apiToken
);

configError(
    "Fal AI API token not defined",
    !config.falAI.apiToken
);

configError(
    "Fee percentage is invalid (0-100 range)",
    Number.isNaN(config.feePercentage)
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
    !config.telegram.staticPaymentReceiptChatId
);

configError(
    `Invalid value for active subscriptions limit (${config.activeSubscriptionLimit}) / Should be an integer in range 1-2000`,
    Number.isNaN(config.activeSubscriptionLimit) || config.activeSubscriptionLimit < 1 || config.activeSubscriptionLimit > 2000
);

if (!fs.existsSync(config.storageBasePath))
    fs.mkdirSync(config.storageBasePath, { recursive: true });

if (config.httpProxyUri) {
    // Corporate proxy uses CA not in undici's certificate store
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const dispatcher = new ProxyAgent({ uri: config.httpProxyUri });
    setGlobalDispatcher(dispatcher);
}

export default config;
