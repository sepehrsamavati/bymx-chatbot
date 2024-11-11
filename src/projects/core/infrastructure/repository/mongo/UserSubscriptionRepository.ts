import type { ServicesType } from "../../../Container.js";
import type { PopulatedProperty } from "./lib/model.type.js";
import type { OpenAIPlanDBModel } from "../../../../../types/entities/openAIPlan.js";
import type { IUserSubscriptionRepository } from "../../../../../types/contracts/repositories.js";
import type { UserSubscription, UserSubscriptionDBModel } from "../../../../../types/entities/userSubscription.js";

export class UserSubscriptionRepository implements IUserSubscriptionRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(userSubscription: UserSubscriptionDBModel): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.userSubscription.create({
            insertDate: userSubscription.insertDate,
            isDeleted: userSubscription.isDeleted,
            plan: userSubscription.plan.id,
            user: userSubscription.user.id,
            expiry: userSubscription.expiry
        });
        return Boolean(res?._id);
    }

    async getActive(userId: string, expiryNotBefore: Date): Promise<Omit<UserSubscription, 'user'> | null> {
        const res = await this.#databaseConnection.models.userSubscription
            .find({
                isDeleted: false,
                expiry: {
                    $gt: expiryNotBefore
                },
                user: userId
            })
            .sort({ expiry: 1 })
            .limit(1)
            .populate<{ plan: PopulatedProperty<OpenAIPlanDBModel> }>("plan" satisfies keyof UserSubscriptionDBModel)
            .lean()
            .exec();

        if (!res)
            return null;

        if (res.length > 1)
            new Error("More than 1 active user subscription retrieved");

        const subscription = res.at(0);

        if (!subscription)
            return null;

        return {
            expiry: subscription.expiry,
            plan: {
                id: subscription.plan._id.toString(),
                available: subscription.plan.available,
                days: subscription.plan.days,
                points: subscription.plan.points,
                price: subscription.plan.price,
                title: subscription.plan.title,
            }
        };
    }

    async getAllActives(userId: string, expiryNotBefore: Date): Promise<Omit<UserSubscription, 'user'>[] | null> {
        const res = await this.#databaseConnection.models.userSubscription.find({
            isDeleted: false,
            user: userId,
            expiry: {
                $lte: expiryNotBefore
            }
        })
            .populate<{
                plan: PopulatedProperty<OpenAIPlanDBModel>;
            }>([
                'plan'
            ])
            .orFail()
            .lean();

        if (!res)
            return null;

        return res.map(item => {
            const plan = item.plan;

            return {
                id: item._id.toString(),
                expiry: item.expiry,
                plan: {
                    id: plan._id.toString(),
                    title: plan.title,
                    available: plan.available,
                    days: plan.days,
                    points: plan.points,
                    price: plan.price
                }
            };
        });
    }
}