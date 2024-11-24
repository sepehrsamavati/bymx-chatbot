import config from "../config.js";
import type { ServicesType } from "../Container.js";
import { getTodayRange } from "../helpers/dateHelper.js";
import { accessHelper } from "../helpers/accessHelper.js";
import { UserType } from "../../../types/enums/userTypes.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import { OpenAIChat } from "../../../types/entities/openAIChat.js";
import { OperationResult } from "../common/dto/OperationResult.js";
import { UserMode, type UserModeType } from "../../../types/enums/userMode.js";
import type { UpsertUserModel, User, UserInfoModel } from "../../../types/entities/user.js";

export default class UserApplication {
    #userRepository;
    #openAIChatRepository;
    #openAIPlanRepository;
    #openAIMessageRepository;
    #userSubscriptionRepository;

    constructor(container: ServicesType) {
        this.#userRepository = container.userRepository;
        this.#openAIChatRepository = container.openAIChatRepository;
        this.#openAIPlanRepository = container.openAIPlanRepository;
        this.#openAIMessageRepository = container.openAIMessageRepository;
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
                memoryAmount: 3,
                saveMessages: false,
            });

            if (!userId)
                return null;

            const _user = await this.#userRepository.getBy({ id: userId });

            return _user;
        }
    }

    async setUserSelectedChatById(user: User, chatId: string | null) {
        const result = new OperationResult();

        let chat: Omit<OpenAIChat, "user"> | null = null;

        if (chatId !== null) {
            chat = await this.#openAIChatRepository.getChat({
                id: chatId
            });

            if (!chat)
                return result.failed();
        }

        const updateResult = await this.#userRepository.update(user.id, {
            selectedChat: chat ? {
                ...chat,
                user: user
            } : undefined
        });

        if (updateResult?.ok)
            result.succeeded();

        return result;
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

    async setUserStatus(userId: User['id'], status: UserStatus) {
        const result = new OperationResult();

        const updateResult = await this.#userRepository.update(userId, {
            status: status
        });

        if (updateResult?.ok)
            result.succeeded();

        return result;
    }

    async setUserPhoneNumber(userId: User['id'], phoneNumber: string, setStatus = false) {
        const result = new OperationResult();

        const updateResult = await this.#userRepository.update(userId, {
            phoneNumber: phoneNumber,
            status: setStatus ? UserStatus.OK : undefined,
        });

        if (updateResult?.ok)
            result.succeeded();

        return result;
    }

    async setSaveMessages(userId: User['id'], saveMessages: boolean) {
        const result = new OperationResult();

        const updateResult = await this.#userRepository.update(userId, {
            saveMessages: saveMessages
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
            isDeleted: false,
            isFinished: false
        });

        return res ? result.succeeded() : result.failed();
    }

    async getActiveSubscription(userId: string) {
        return await this.#userSubscriptionRepository.getActive(userId, new Date());
    }

    async getFreePointStatus(userId: string) {
        const [start, end] = getTodayRange();

        const freePointUsage = await this.#openAIMessageRepository.getFreePointUsage(userId, start, end);


        if (freePointUsage === null)
            return null;

        const { dailyFreePoints } = config;

        return {
            used: freePointUsage,
            remaining: freePointUsage < dailyFreePoints ? dailyFreePoints - freePointUsage : 0,
            total: dailyFreePoints
        };
    }

    async getUserFileProcessingStatus(userId: string) {
        const result = new OperationResult();

        const fromDate = new Date();
        fromDate.setMinutes(fromDate.getMinutes() - config.fileProcessingLimit.timePeriod);

        const count = await this.#openAIMessageRepository.countUserFileUsage(userId, fromDate);

        if (count === null || Number.isNaN(count))
            return result.failed("errorOccurred");

        if (count >= config.fileProcessingLimit.count)
            return result.failed("fileProcessingLimitReached");

        return result.succeeded();
    }

    async getAdminStatistics(user: User) {
        const [todayStart, todayEnd] = getTodayRange();

        if (!accessHelper(UserType.Admin, user.type))
            return null;

        const [
            usersCount,
            usages
        ] = await Promise.all([
            this.#userRepository.countAll(),
            this.#openAIMessageRepository.getUsage(todayStart, todayEnd),
        ]);

        return {
            usersCount,
            messageUsage: {
                ...usages,
                cost: usages?.cost.toFixed(2)
            }
        };
    }

    getUserInfo(tgId: number): Promise<UserInfoModel | null>;
    getUserInfo(username: string): Promise<UserInfoModel | null>;
    async getUserInfo(tgIdOrUsername: number | string): Promise<UserInfoModel | null> {
        let user: User | null = null;

        switch (typeof tgIdOrUsername) {
            case "string":
                user = await this.#userRepository.getBy({ username: tgIdOrUsername });
                break;
            case "number":
                user = await this.#userRepository.getBy({ tgId: tgIdOrUsername });
                break;
        }

        if (!user)
            return null;

        const [
            activePlans,
            dailyFreePointStatus
        ] = await Promise.all([
            this.#userSubscriptionRepository.countByUserId(user.id, new Date()),
            this.getFreePointStatus(user.id)
        ]);

        return {
            user: user,
            activePlans: activePlans,
            remainingDailyFreePoints: dailyFreePointStatus?.remaining ?? null,
        };
    }

    async getUserByTgId(tgId: number): Promise<User | null> {
        return await this.#userRepository.getBy({ tgId: tgId });
    }
}