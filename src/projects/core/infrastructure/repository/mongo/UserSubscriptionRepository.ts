import type { ServicesType } from "../../../Container.js";
import type { PopulatedProperty } from "./lib/model.type.js";
import type { UserDBModel } from "../../../../../types/entities/user.js";
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

    async getActives(userId: string, expiryNotBefore: Date): Promise<UserSubscription[] | null> {
        const res = await this.#databaseConnection.models.userSubscription.find({
            isDeleted: false,
            user: userId,
            expiry: {
                $lte: expiryNotBefore
            }
        })
            .populate<{
                user: PopulatedProperty<UserDBModel>;
                plan: PopulatedProperty<OpenAIPlanDBModel>;
            }>([
                'user',
                'plan'
            ])
            .orFail()
            .lean();

        if (!res)
            return null;

        return res.map(item => {
            const user = item.user;
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
                },
                user: {
                    id: user._id.toString(),
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    lang: user.lang,
                    lastActivity: user.lastActivity,
                    mode: user.mode,
                    status: user.status,
                    tgId: user.tgId,
                    type: user.type,
                    usage: user.usage,
                    selectedChat: user.selectedChat,
                }
            };
        });
    }
}