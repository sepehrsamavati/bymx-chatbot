import config from "../config.js";
import type { AIModel } from "../types/entities/aiModel.js";

const pointsPerDollar = 1_000;

export const calculatePointUsage = (opts: { usd: number; } | { usdCent: number; }) => {
    if ('usd' in opts) {
        return Math.ceil(pointsPerDollar * opts.usd);
    } else if ('usdCent' in opts) {
        return Math.ceil(pointsPerDollar * opts.usdCent / 100);
    }
    throw new TypeError("Invalid parameter for function 'calculatePointUsage'");
};

export const modelCostCalculator = (opts: {
    inputUnits: number;
    outputUnits: number;
    model: AIModel;
}) => {
    const { inputUnits, outputUnits, model: { pricePmu } } = opts;
    const { feePercentage } = config;

    const inputTextCost = pricePmu.input * (inputUnits / 1_000_000);
    const outputTextCost = pricePmu.output * (outputUnits / 1_000_000);

    const cost = inputTextCost + outputTextCost;
    const price = cost + ((feePercentage * cost) / 100);
    const userPointCost = Math.ceil(price * pointsPerDollar);

    return {
        /** No profit $USD price */
        cost,
        /** End user $USD price */
        price,
        /** End user point cost */
        userPointCost
    };
};

export const modelCostPredication = (opts: {
    inputUnits: number;
    pointUsageLimit: number;
    model: AIModel;
    offsetCost?: number;
}) => {
    const { feePercentage } = config;

    const inputCost = modelCostCalculator({
        ...opts,
        outputUnits: 0
    });

    const notRoundedInputPointCost = ((opts.offsetCost ?? 0) * pointsPerDollar) + inputCost.price * pointsPerDollar;

    if (notRoundedInputPointCost >= opts.pointUsageLimit)
        return {
            inputLimit: true,
            outputTokens: 0
        };

    const userDollarCharge = (1 - (feePercentage / 100)) * (opts.pointUsageLimit / pointsPerDollar);

    const outputTokens = (1_000_000 * userDollarCharge) / opts.model.pricePmu.output;

    return {
        inputLimit: false,
        outputTokens: Math.floor(outputTokens)
    };
}

export const modelUsageCalculator = (model: AIModel) => {
    const { userPointCost } = modelCostCalculator({
        inputUnits: 350,
        outputUnits: 350,
        model: model
    });

    return {
        /** Messages per 1K points ($1) */
        normalLengthTextMessage: Math.floor(1000 / userPointCost)
    };
}
