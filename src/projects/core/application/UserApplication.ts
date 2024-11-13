import type { ServicesType } from "../Container.js";
import { UserType } from "../../../types/enums/userTypes.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import { OperationResult } from "../common/dto/OperationResult.js";
import type { UpsertUserModel, User } from "../../../types/entities/user.js";
import { UserMode, type UserModeType } from "../../../types/enums/userMode.js";
import { OpenAIChat } from "../../../types/entities/openAIChat.js";

export default class UserApplication {
    #userRepository;
    #openAIChatRepository;
    #openAIPlanRepository;
    #userSubscriptionRepository;

    constructor(container: ServicesType) {
        this.#userRepository = container.userRepository;
        this.#openAIChatRepository = container.openAIChatRepository;
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
}