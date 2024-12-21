import { franc } from "franc-min";
import config from "../config.js";
import { fal } from "@fal-ai/client";
import { ServicesType } from "../Container.js";
import { errorLogger } from "../helpers/logger.js";
import translate from "@iamtraction/google-translate";
import { User } from "../../../types/entities/user.js";
import { calculatePointUsage } from "../helpers/costCalculator.js";
import { OperationResultWithData } from "../common/dto/OperationResult.js";

type AIGeneratedImageResponse = {
    url: string;
    modelName: string;
    pointUsage: number;
}

fal.config({
    credentials: config.falAI.apiToken,
});

export default class AIApplication {
    #messageLock;
    #promptRepository;
    #aiModelCache;
    #userSubscriptionApplication;

    #fluxModelName = "fal-ai/flux/schnell";

    constructor(container: ServicesType) {
        this.#aiModelCache = container.aiModelCache;
        this.#messageLock = container.aiMessageLockCache;
        this.#promptRepository = container.promptRepository;
        this.#userSubscriptionApplication = container.userSubscriptionApplication;
    }

    async fluxImageGenerate(user: User, message: string): Promise<OperationResultWithData<AIGeneratedImageResponse>> {
        const result = new OperationResultWithData<AIGeneratedImageResponse>().failed("errorOccurred");

        const model = this.#aiModelCache.getModelByName(this.#fluxModelName);
        if (!model)
            return result.failed();

        const costUsdCent = model.pricePmu.outputImage / (1_000_000 * 100); // 0.3;
        const userPointCost = calculatePointUsage({ usdCent: costUsdCent + (((config.openAI.feePercentage * costUsdCent) / 100)) });

        const { subscriptions, totalRemainingPoints } = await this.#userSubscriptionApplication.getActiveSubscriptions(user.id, true) ?? {};

        if (!(subscriptions && totalRemainingPoints !== undefined))
            return result.failed();

        if (totalRemainingPoints <= 0)
            return result.failed("noPointAvailable");

        if (totalRemainingPoints < userPointCost)
            return result.failed("pointNotEnough");

        if (this.#messageLock.isLocked(user.id))
            return result.failed("youHavePendingPrompts");

        this.#messageLock.lock(user.id);

        const startTime = performance.now();

        let prompt = message;

        const lang = franc(prompt);

        if (lang !== "eng") {
            try {
                const translateResult = await translate(prompt);
                prompt = translateResult.text;
            } catch (err) {
                errorLogger(`Translation failed for '${prompt}' user '${user.id}'`, err);
            }
        }

        const falResponse = await fal.subscribe(model.name, {
            input: {
                prompt,
                enable_safety_checker: true,
            },
            // logs: true,
            // onQueueUpdate: (update) => {
            //     if (update.status === "IN_PROGRESS") {
            //         update.logs.map((log) => log.message).forEach(console.log);
            //     }
            // },
        });

        const responseTime = performance.now() - startTime;

        const generatedImage = falResponse.data.images.at(0);
        if (generatedImage && falResponse.data.images.length === 1) {
            const contentPolicyViolation = falResponse.data.has_nsfw_concepts.includes(true);
            if (contentPolicyViolation) {
                result.failed("promptContentNotAllowed");
            }
            else {
                result
                    .succeeded()
                    .setData({
                        url: generatedImage.url,
                        pointUsage: userPointCost,
                        modelName: model.name,
                    });

                const savedUsageIds = await this.#userSubscriptionApplication.saveSubscriptionsUsage(userPointCost, subscriptions);

                await this.#promptRepository.create({
                    cost: costUsdCent / 100,
                    insertDate: new Date(),
                    isDeleted: false,
                    input: message,
                    output: generatedImage.url,
                    points: userPointCost,
                    model: model.name,
                    saved: false,
                    usages: savedUsageIds ?? [],
                    promptUser: user,
                    responseTime: responseTime,
                });
            }
        }

        this.#messageLock.unlock(user.id);

        return result;
    }
}