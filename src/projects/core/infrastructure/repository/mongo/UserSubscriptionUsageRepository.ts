import mongoose from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { UserSubscription } from "../../../../../types/entities/userSubscription.js";
import type { IUserSubscriptionUsageRepository } from "../../../../../types/contracts/repositories.js";
import type { CreateUserSubscriptionUsage } from "../../../../../types/entities/userSubscriptionUsage.js";

export class UserSubscriptionUsageRepository implements IUserSubscriptionUsageRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async createMany(usages: CreateUserSubscriptionUsage[]): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.userSubscriptionUsage.insertMany(
            usages.map(
                usage => ({
                    insertDate: usage.insertDate,
                    isDeleted: usage.isDeleted,
                    points: usage.points,
                    userSubscription: usage.userSubscription
                })
            )
        );
        return Boolean(res.length === usages.length);
    }

    async getPointUsageById(userSubscriptionId: UserSubscription["id"]): Promise<number | null> {
        type AggregationResult = { _id: null; sum: number; }[] | undefined;
        const res = (
            await this.#databaseConnection.models.userSubscriptionUsage
                .aggregate([
                    {
                        $match: {
                            isDeleted: false,
                            userSubscription: new mongoose.Types.ObjectId(userSubscriptionId)
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