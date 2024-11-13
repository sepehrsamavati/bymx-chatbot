import config from "../config.js";
import type { OpenAIModel } from "../../../types/entities/openAIModel.js";

const pointsPerDollar = 1_000;

export const modelCostCalculator = (opts: {
    inputUnits: number;
    outputUnits: number;
    model: OpenAIModel;
    /** 0-100 range */
    profitPercentage: number;
}) => {
    const { profitPercentage, inputUnits, outputUnits, model: { pricePmu } } = opts;

    const inputTextCost = pricePmu.inputText * (inputUnits / 1_000_000);
    const outputTextCost = pricePmu.outputText * (outputUnits / 1_000_000);

    const cost = inputTextCost + outputTextCost;
    const price = cost + ((profitPercentage * cost) / 100);
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

export const modelUsageCalculator = (model: OpenAIModel) => {
    const { userPointCost } = modelCostCalculator({
        inputUnits: 350,
        outputUnits: 350,
        model: model,
        profitPercentage: config.openAI.feePercentage
    });

    return {
        /** Messages per 1K points ($1) */
        normalLengthTextMessage: Math.floor(1000 / userPointCost)
    };
}
