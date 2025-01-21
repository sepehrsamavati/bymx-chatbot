import type { FilterQuery, UpdateQuery } from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { User } from "../../../types/entities/user.js";
import type { IUserSubscriptionRepository } from "../../../types/contracts/repositories.js";
import type { CreateUserSubscription, SearchUserSubscription, UpdateUserSubscription, UserSubscription, UserSubscriptionDBModel } from "../../../types/entities/userSubscription.js";
import { PopulatedProperty } from "./lib/model.type.js";

export class UserSubscriptionRepository implements IUserSubscriptionRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    #getFilter(filter: SearchUserSubscription) {
        const _filter: FilterQuery<UserSubscription> = {};

        if (filter.expiryNotBefore !== undefined)
            _filter.expiry = {
                $gt: filter.expiryNotBefore
            };

        if (filter.isDeleted !== undefined)
            _filter.isDeleted = filter.isDeleted;

        if (filter.isFinished !== undefined)
            _filter.isFinished = filter.isFinished;

        if (filter.user !== undefined)
            _filter.user = typeof filter.user === "string" ? filter.user : filter.user.id;

        if (filter.planId !== undefined)
            _filter["plan._id"] = filter.planId;

        if (filter.planType !== undefined)
            _filter["plan.type"] = filter.planType;

        return _filter;
    }

    async create(userSubscription: CreateUserSubscription): Promise<string | null> {
        const res = await this.#databaseConnection.models.userSubscription.create({
            insertDate: userSubscription.insertDate,
            isDeleted: userSubscription.isDeleted,
            plan: {
                id: userSubscription.plan.id,
                title: userSubscription.plan.title,
                type: userSubscription.plan.type,
                price: userSubscription.plan.price,
                points: userSubscription.plan.points
            },
            user: userSubscription.user,
            expiry: userSubscription.expiry,
            isFinished: userSubscription.isFinished
        });
        return res?._id.toString() || null;
    }

    async count(filter: SearchUserSubscription): Promise<number | null> {
        const count = await this.#databaseConnection.models.userSubscription.countDocuments(this.#getFilter(filter));
        return count;
    }

    async getById(id: string): Promise<UserSubscriptionDBModel | null> {
        const res = await this.#databaseConnection.models.userSubscription
            .findById(id)
            .populate<{ user: PopulatedProperty<User> }>('user' satisfies keyof UserSubscription)
            .lean()
            .exec();

        if (!res)
            return null;

        const subscription = res;

        return {
            id: subscription._id.toString(),
            user: {
                ...subscription.user,
                id: subscription.user._id.toString()
            },
            expiry: subscription.expiry,
            isDeleted: subscription.isDeleted,
            isFinished: subscription.isFinished,
            insertDate: subscription.insertDate,
            plan: {
                id: subscription.plan.id,
                points: subscription.plan.points,
                price: subscription.plan.price,
                title: subscription.plan.title,
                type: subscription.plan.type
            }
        };
    }

    async getMany(filter: SearchUserSubscription): Promise<Omit<UserSubscription, 'user'>[] | null> {
        const res = await this.#databaseConnection.models.userSubscription.find(this.#getFilter(filter));

        if (!res)
            return null;

        return res.map(subscription => (
            {
                id: subscription._id.toString(),
                expiry: subscription.expiry,
                isFinished: subscription.isFinished,
                plan: {
                    id: subscription.plan.id,
                    points: subscription.plan.points,
                    price: subscription.plan.price,
                    title: subscription.plan.title,
                    type: subscription.plan.type
                }
            }
        ));
    }

    async getAllActive(userId: string, expiryNotBefore: Date): Promise<Omit<UserSubscription, 'user'>[] | null> {
        const res = await this.#databaseConnection.models.userSubscription.find({
            isDeleted: false,
            isFinished: false,
            user: userId,
            expiry: {
                $gt: expiryNotBefore
            }
        })
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
                    id: plan.id,
                    title: plan.title,
                    points: plan.points,
                    price: plan.price,
                    type: plan.type,
                }
            };
        });
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