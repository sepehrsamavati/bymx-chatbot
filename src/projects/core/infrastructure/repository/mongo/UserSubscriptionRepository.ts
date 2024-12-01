import type { UpdateQuery } from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { PopulatedProperty } from "./lib/model.type.js";
import type { PlanDBModel } from "../../../../../types/entities/plan.js";
import type { IUserSubscriptionRepository } from "../../../../../types/contracts/repositories.js";
import type { UpdateUserSubscription, UserSubscription, UserSubscriptionDBModel } from "../../../../../types/entities/userSubscription.js";

export class UserSubscriptionRepository implements IUserSubscriptionRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(userSubscription: Omit<UserSubscriptionDBModel, 'id'>): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.userSubscription.create({
            insertDate: userSubscription.insertDate,
            isDeleted: userSubscription.isDeleted,
            plan: userSubscription.plan.id,
            user: userSubscription.user.id,
            expiry: userSubscription.expiry,
            isFinished: userSubscription.isFinished
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
            .populate<{ plan: PopulatedProperty<PlanDBModel> }>("plan" satisfies keyof UserSubscriptionDBModel)
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
            id: subscription._id.toString(),
            expiry: subscription.expiry,
            isFinished: subscription.isFinished,
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
            isFinished: false,
            user: userId,
            expiry: {
                $lte: expiryNotBefore
            }
        })
            .populate<{
                plan: PopulatedProperty<PlanDBModel>;
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
                isFinished: item.isFinished,
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

    async countByUserId(userId: string, expiryNotBefore: Date): Promise<number | null> {
        const count = await this.#databaseConnection.models.userSubscription.countDocuments({
            isDeleted: false,
            isFinished: false,
            user: userId,
            expiry: {
                $lte: expiryNotBefore
            }
        });
        return count;
    }

    async updateById(update: UpdateUserSubscription): Promise<boolean | null> {
        const _update: UpdateQuery<UserSubscriptionDBModel> = {};

        if (update.isFinished !== undefined) {
            _update.isFinished = update.isFinished;
        }

        const res = await this.#databaseConnection.models.userSubscription.updateOne({
            _id: update.id
        }, _update);

        return Boolean(res.modifiedCount === 1);
    }
}