import mongoose from "mongoose";
import type { ServicesType } from "../../../Container.js";
import { OpenAIUsageDBModel } from "../../../../../types/entities/openAIUsage.js";
import type { IOpenAIUsageRepository } from "../../../../../types/contracts/repositories.js";

export class OpenAIUsageRepository implements IOpenAIUsageRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(usage: OpenAIUsageDBModel): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.openAIUsage.create({
            cost: usage.cost,
            insertDate: usage.insertDate,
            isDeleted: usage.isDeleted,
            model: usage.model.id,
            points: usage.points,
            user: usage.user.id
        });
        return Boolean(res?._id);
    }

    async userPointUsage(userId: string, fromDate: Date, toDate: Date): Promise<number | null> {
        type AggregationResult = { _id: null; sum: number; }[] | undefined;
        const res = (
            await this.#databaseConnection.models.openAIUsage
                .aggregate([
                    {
                        $match: {
                            isDeleted: false,
                            user: new mongoose.Types.ObjectId(userId),
                            insertDate: {
                                $gte: fromDate,
                                $lte: toDate
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            sum: {
                                $sum: "$points"
                            }
                        }
                    }
                ])
        ) as AggregationResult;

        if (!res || res.length === 0)
            return 0;

        if (res.length !== 1)
            throw new Error("Invalid aggregation result");

        const _userPointUsage = res[0].sum;

        return _userPointUsage;
    }
}