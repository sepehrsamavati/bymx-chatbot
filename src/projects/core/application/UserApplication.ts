import type { ServicesType } from "../Container.js";
import { UserType } from "../../../types/enums/userTypes.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import { OperationResult } from "../common/dto/OperationResult.js";
import type { UpsertUserModel, User } from "../../../types/entities/user.js";
import { UserMode, type UserModeType } from "../../../types/enums/userMode.js";

export default class UserApplication {
    #userRepository;
    #openAIPlanRepository;
    #userSubscriptionRepository;

    constructor(container: ServicesType) {
        this.#userRepository = container.userRepository;
        this.#openAIPlanRepository = container.openAIPlanRepository;
        this.#userSubscriptionRepository = container.userSubscriptionRepository;
    }

    async upsert(user: UpsertUserModel) {

        const _user = await this.#userRepository.getAndUpdate(user, { tgId: user.tgId });

        if (_user) {
            return _user;
        } else {
            const userId = await this.#userRepository.create({
                ...user,
                usage: 0,
                isDeleted: false,
                insertDate: new Date(),
                lastActivity: Date.now(),
                mode: UserMode.General.Normal,
                status: UserStatus.EULA,
                type: UserType.Normal,
            });

            if (!userId)
                return null;

            const _user = await this.#userRepository.getBy({ id: userId });

            return _user;
        }
    }

    async setUserMode(userId: User['id'], mode: UserModeType) {
        const result = new OperationResult();

        const updateResult = await this.#userRepository.update(userId, {
            mode: mode
        });

        if (updateResult?.ok)
            result.succeeded();

        return result;
    }

    async purchasePlan(user: User, planId: string) {
        const result = new OperationResult();

        const plan = await this.#openAIPlanRepository.getById(planId);

        if (!plan)
            return result.failed("planNotExist");

        if (!plan.available)
            return result.failed("planNotAvailable");

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + plan.days);

        const res = await this.#userSubscriptionRepository.create({
            user: user,
            plan: plan,
            expiry: expiry,
            insertDate: new Date(),
            isDeleted: false
        });

        return res ? result.succeeded() : result.failed();
    }
}