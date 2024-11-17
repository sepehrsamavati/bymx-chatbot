import config from "../config.js";
import type { OpenAIModel } from "../../../types/entities/openAIModel.js";

const pointsPerDollar = 1_000;

export const modelCostCalculator = (opts: {
    inputUnits: number;
    outputUnits: number;
    model: OpenAIModel;
}) => {
    const { inputUnits, outputUnits, model: { pricePmu } } = opts;
    const { feePercentage } = config.openAI;

    const inputTextCost = pricePmu.inputText * (inputUnits / 1_000_000);
    const outputTextCost = pricePmu.outputText * (outputUnits / 1_000_000);

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
    model: OpenAIModel;
}) => {
    const { feePercentage } = config.openAI;

    const inputCost = modelCostCalculator({
        ...opts,
        outputUnits: 0
    });

    const notRoundedInputPointCost = inputCost.price * pointsPerDollar;

    if (notRoundedInputPointCost >= opts.pointUsageLimit)
        return {
            inputLimit: true,
            outputTokens: 0
        };

    const userDollarCharge = (1 - (feePercentage / 100)) * (opts.pointUsageLimit / pointsPerDollar);

    const outputTokens = (1_000_000 * userDollarCharge) / opts.model.pricePmu.outputText;

    return {
        inputLimit: false,
        outputTokens
    };
}

export const modelUsageCalculator = (model: OpenAIModel) => {
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
