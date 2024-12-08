import config from "../config.js";
import type { ServicesType } from "../Container.js";
import { getTodayRange } from "../helpers/dateHelper.js";
import type { User } from "../../../types/entities/user.js";
import { PlanType } from "../../../types/enums/planTypes.js";
import { OperationResult } from "../common/dto/OperationResult.js";
import type { CreateUserSubscription, UserSubscription } from "../../../types/entities/userSubscription.js";

type SubscriptionWithUsage = Omit<UserSubscription, 'user'> & { _usage: number };

export default class UserSubscriptionApplication {
    #planRepository;
    #userSubscriptionRepository;
    #userSubscriptionUsageRepository;

    constructor(container: ServicesType) {
        this.#planRepository = container.planRepository;
        this.#userSubscriptionRepository = container.userSubscriptionRepository;
        this.#userSubscriptionUsageRepository = container.userSubscriptionUsageRepository;
    }

    /** @deprecated */
    async #_countUserActivePaidSubscriptions(userId: string) {
        return await this.#userSubscriptionRepository.count({
            user: userId,
            expiryNotBefore: new Date(),
            planType: PlanType.Expirable,
        });
    }

    async getActiveSubscriptions(userId: string, upsertDailyFree = false) {
        const subscriptions = await this.#userSubscriptionRepository.getAllActive(userId, new Date());

        if (!subscriptions)
            return null;

        let hasDailyFree = subscriptions.some(subscription => subscription.plan.type === PlanType.DailyFree);

        if (upsertDailyFree && !hasDailyFree) {
            const dailyFreeSubscription = await this.upsertCurrentDailyFreeSubscription(userId);

            if (!dailyFreeSubscription)
                return null;

            hasDailyFree = true;
            subscriptions.unshift(dailyFreeSubscription);
        }

        const usages = await this.#userSubscriptionUsageRepository
            .getPointUsageByIds(
                subscriptions.map(subscription => subscription.id)
            );

        if (!usages)
            return null;

        const result = subscriptions
            .sort((a, b) => {
                if (a.plan.type === b.plan.type) {
                    // If types are the same, sort by date
                    return a.expiry.getTime() - b.expiry.getTime();
                }
                return a.plan.type === PlanType.DailyFree ? -1 : 1;
            })
            .map(subscription => {
                const usage = usages.find(u => u.userSubscriptionId === subscription.id);

                return {
                    ...subscription,
                    plan: {
                        ...subscription.plan,
                        points: subscription.plan.type === PlanType.DailyFree ? config.dailyFreePoints : subscription.plan.points
                    },
                    _usage: usage?.amount ?? 0
                };
            });

        // if (result.length < subscriptions.length)
        //     logger.warn(`Couldn't get all subscriptions usages of user #${userId} at ${new Date().toISOString()}`);

        return {
            hasDailyFree,
            subscriptions: result,
            totalRemainingPoints: result.map(s => s.plan.points).reduce((a, b) => a + b, 0) - result.map(s => s._usage).reduce((a, b) => a + b, 0)
        };
    }

    async getSubscriptionInfo(userId: string, subscriptionId: string) {
        const subscription = await this.#userSubscriptionRepository.getById(subscriptionId);

        if (!subscription)
            return null;

        if (subscription.isDeleted || subscription.user.id !== userId)
            return null;

        const [usage] = await this.#userSubscriptionUsageRepository
            .getPointUsageByIds([subscription.id]) ?? [];

        return {
            subscription: subscription as UserSubscription,
            remainingPoints: subscription.plan.points - (usage?.amount ?? 0)
        };
    }

    async getActivePaidSubscriptions(userId: string) {
        const result = await this.getActiveSubscriptions(userId, false);

        if (result?.subscriptions)
            result.subscriptions = result.subscriptions.filter(subscription => subscription.plan.type !== PlanType.DailyFree);

        return result;
    }

    async upsertCurrentDailyFreeSubscription(userId: string) {
        let activeDailyFreeSubscription: Omit<UserSubscription, "user"> | null | undefined = await this.#getActiveDailyFreeSubscription(userId);

        if (!activeDailyFreeSubscription) {
            const [, todayEnd] = getTodayRange();
            const [plan] = await this.#planRepository.getMany({
                isDeleted: false,
                type: PlanType.DailyFree,
            }) ?? [];

            if (!plan)
                return null;

            const dto: CreateUserSubscription = {
                user: userId,
                plan: plan,
                expiry: todayEnd,
                insertDate: new Date(),
                isDeleted: false,
                isFinished: false
            };

            const createdSubscriptionId = await this.#userSubscriptionRepository.create(dto);

            if (!createdSubscriptionId)
                return null;

            activeDailyFreeSubscription = {
                id: createdSubscriptionId,
                ...dto
            };
        }

        if (!activeDailyFreeSubscription)
            return null;

        return activeDailyFreeSubscription;
    }

    async #getActiveDailyFreeSubscription(userId: string) {
        const activeDailyFreeSubscriptions = await this.#userSubscriptionRepository.getMany({
            planType: PlanType.DailyFree,
            user: userId,
            isDeleted: false,
            expiryNotBefore: new Date(),
            // should not affect `isFinished`
        });

        if (!activeDailyFreeSubscriptions || activeDailyFreeSubscriptions.length > 1)
            return null;

        const activeDailyFreeSubscription = activeDailyFreeSubscriptions.at(0);

        return activeDailyFreeSubscription ?? null;
    }

    /**
     * @param activeDailyFreeSubscription Passing subscription object or null will use cache / passing undefined will get from repository
     */
    async getDailyFreePointStatus(userId: string, activeDailyFreeSubscription: Omit<UserSubscription, "user"> | null = null) {
        if (activeDailyFreeSubscription === undefined)
            activeDailyFreeSubscription = await this.#getActiveDailyFreeSubscription(userId);

        if (!activeDailyFreeSubscription) // daily free subscription not created
            return {
                subscription: null,
                used: 0,
                ...this.calculateDailyFreePoints(0)
            };

        const freePointUsage = await this.#userSubscriptionUsageRepository.getPointUsageById(activeDailyFreeSubscription.id);

        if (freePointUsage === null)
            return null;

        return {
            subscription: activeDailyFreeSubscription,
            used: freePointUsage,
            ...this.calculateDailyFreePoints(freePointUsage)
        };
    }

    async purchasePlan(userId: User['id'], planId: string) {
        const result = new OperationResult();

        const plan = await this.#planRepository.getById(planId);

        if (!plan)
            return result.failed("planNotExist");

        if (!plan.available)
            return result.failed("planNotAvailable");

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + plan.days);

        const res = await this.#userSubscriptionRepository.create({
            user: userId,
            plan: plan,
            expiry: expiry,
            insertDate: new Date(),
            isDeleted: false,
            isFinished: false,
        });

        return res ? result.succeeded() : result.failed();
    }

    calculateDailyFreePoints(currentUsage: number) {
        const { dailyFreePoints } = config;
        return {
            remaining: currentUsage < dailyFreePoints ? dailyFreePoints - currentUsage : 0,
            total: dailyFreePoints
        };
    }

    async saveSubscriptionsUsage(userPointCost: number, subscriptions: SubscriptionWithUsage[]) {
        let calculatedPoints = 0;
        const usedSubscriptions: { id: string; usedAmount: number; }[] = [];

        for (const subscription of subscriptions) {
            /** Remaining points to calculate */
            const remainingPoints = userPointCost - calculatedPoints;

            if (remainingPoints <= 0)
                break;

            const subscriptionRemainingPoints = Math.floor(subscription.plan.points - subscription._usage);

            if (subscriptionRemainingPoints <= 0) { // subscription has no points remaining
                if (!subscription.isFinished) {
                    subscription.isFinished = true; // just updating memory cache to prevent issues
                    await this.#userSubscriptionRepository.updateById({
                        id: subscription.id,
                        isFinished: true,
                    });
                }
                continue;
            }

            if (subscriptionRemainingPoints >= remainingPoints) { // subscription remaining points are enough
                calculatedPoints += remainingPoints;
                usedSubscriptions.push({
                    id: subscription.id,
                    usedAmount: remainingPoints,
                });
            } else { // using all subscription remaining points
                calculatedPoints += subscriptionRemainingPoints;
                usedSubscriptions.push({
                    id: subscription.id,
                    usedAmount: subscriptionRemainingPoints,
                });
            }
        }

        const date = new Date();

        const savedUsages = await this.#userSubscriptionUsageRepository.createMany(
            usedSubscriptions.map(s => (
                {
                    insertDate: date,
                    isDeleted: false,
                    points: s.usedAmount,
                    userSubscription: s.id
                }
            ))
        );

        return savedUsages;
    }
}