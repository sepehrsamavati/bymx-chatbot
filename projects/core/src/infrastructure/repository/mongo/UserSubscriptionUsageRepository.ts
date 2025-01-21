import mongoose from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { UserSubscription } from "../../../types/entities/userSubscription.js";
import type { IUserSubscriptionUsageRepository } from "../../../types/contracts/repositories.js";
import type { CreateUserSubscriptionUsage } from "../../../types/entities/userSubscriptionUsage.js";

export class UserSubscriptionUsageRepository implements IUserSubscriptionUsageRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async createMany(usages: CreateUserSubscriptionUsage[]): Promise<string[] | null> {
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
        return res.map(item => item._id.toString());
    }

    async getPointUsageByIds(userSubscriptionIds: UserSubscription["id"][]): Promise<{ userSubscriptionId: string; amount: number; }[] | null> {
        type AggregationResult = { _id: string; sum: number; }[] | undefined;
        const res = (
            await this.#databaseConnection.models.userSubscriptionUsage
                .aggregate([
                    {
                        $match: {
                            isDeleted: false,
                            userSubscription: {
                                $in: userSubscriptionIds.map(id => new mongoose.Types.ObjectId(id))
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$userSubscription",
                            sum: {
                                $sum: "$points"
                            }
                        }
                    }
                ])
        ) as AggregationResult;

        if (!res)
            return null;

        return res.map(item => (
            {
                userSubscriptionId: item._id.toString(),
                amount: item.sum,
            }
        ));
    }

    async getPointUsageById(userSubscriptionId: UserSubscription["id"]): Promise<number | null> {
        const res = await this.getPointUsageByIds([userSubscriptionId]);

        if (!res || res.length === 0)
            return 0;

        const item = res[0];

        if (res.length !== 1 || item.userSubscriptionId !== userSubscriptionId)
            throw new Error("Invalid aggregation result");

        return item.amount;
    }
}