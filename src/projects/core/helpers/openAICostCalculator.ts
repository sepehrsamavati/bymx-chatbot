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

const modelCostPredication = (opts: {
    inputUnits: number;
    model: OpenAIModel;
}) => {
    const minimumResponseUnits = Math.round(opts.inputUnits / 3); // 30% of input
    return modelCostCalculator({
        ...opts,
        outputUnits: minimumResponseUnits
    });
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
