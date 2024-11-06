import type { OpenAIModel } from "../../../types/entities/openAIModel.js";

const pointsPerDollar = 1_000;

const modelCostCalculator = (opts: {
    tokenCount: number;
    model: OpenAIModel;
    /** 0-100 range */
    profitPercentage: number;
}) => {
    const { profitPercentage, tokenCount, model: { pricePmt } } = opts;

    const cost = pricePmt * (tokenCount / 1_000_000);
    const price = cost + ((profitPercentage * cost) / 100);
    const userPointCost = Math.round(price * pointsPerDollar);

    return {
        /** No profit $USD price */
        cost,
        /** End user $USD price */
        price,
        /** End user point cost */
        userPointCost
    };
};
