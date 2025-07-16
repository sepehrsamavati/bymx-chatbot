import config from "../config.js";
import { logger } from "../helpers/logger.js";
import type { ServicesType } from "../Container.js";
import { AIChat } from "../types/entities/aiChat.js";
import { UserType } from "../types/enums/userTypes.js";
import { LangCode, langCodes } from "../i18n/UIText.js";
import { getTodayRange } from "../helpers/dateHelper.js";
import { accessHelper } from "../helpers/accessHelper.js";
import { UserStatus } from "../types/enums/userStatus.js";
import { aiVoices, AIVoice } from "../types/enums/aiVoice.js";
import { UserMode, type UserModeType } from "../types/enums/userMode.js";
import { AIChatHistoryMemory } from "../types/enums/aiChatHistoryMemory.js";
import type { UpsertUserModel, User, UserInfoModel, UserViewModel } from "../types/entities/user.js";
import { OperationResult, OperationResultWithData } from "../common/dto/OperationResult.js";
import isPhoneNumberSupported from "../helpers/isPhoneNumberSupported.js";

export default class UserApplication {
    #userRepository;
    #aiChatRepository;
    #promptRepository;
    #userSubscriptionApplication;
    #inviteLockCache;
    #transaction;

    constructor(container: ServicesType) {
        this.#userRepository = container.userRepository;
        this.#aiChatRepository = container.aiChatRepository;
        this.#promptRepository = container.promptRepository;
        this.#userSubscriptionApplication = container.userSubscriptionApplication;
        this.#inviteLockCache = container.calculateInviteLockCache;
        this.#transaction = container.databaseTransaction;
    }

    toViewModel(user: User): UserViewModel {
        return {
            id: user.id,
            type: user.type,
            lang: user.lang,
            firstName: user.telegram?.firstName ?? "",
            lastName: user.telegram?.lastName ?? "",
            memoryAmount: user.memoryAmount,
            saveMessages: user.saveMessages,
            shouldAcceptEula: user.status === UserStatus.EULA,
        };
    }

    async obtain(user: UpsertUserModel) {
        const _user = user.telegram ? await this.#userRepository.getAndUpdate({
            telegramFirstName: user.telegram?.firstName,
            telegramLastName: user.telegram?.lastName,
            telegramUsername: user.telegram?.username,
        }, { telegram: { id: user.telegram.id }, status: { notEqual: [UserStatus.Banned] }, }) : undefined;

        if (_user) {
            return _user;
        } else {
            const userId = await this.#userRepository.create({
                ...user,
                usage: 0,
                isDeleted: false,
                insertDate: new Date(),
                lastActivity: Date.now(),
                telegram: user.telegram ? {
                    ...user.telegram,
                    inviteCount: 0,
                    mode: UserMode.General.Normal,
                } : undefined,
                status: UserStatus.EULA,
                type: UserType.Normal,
                memoryAmount: AIChatHistoryMemory.Normal,
                saveMessages: true,
                voiceResponse: {
                    on: false,
                    type: "onyx",
                },
                memory: {
                    on: false,
                    footprints: []
                },
            });

            if (!userId)
                return null;

            const _user = await this.#userRepository.getBy({ id: userId });

            return _user;
        }
    }

    async setUserSelectedChatById(user: User, chatId: string | null) {
        const result = new OperationResult();

        let chat: Omit<AIChat, "user"> | null = null;

        if (chatId !== null) {
            chat = await this.#aiChatRepository.getChat({
                id: chatId
            });

            if (!chat)
                return result.failed();
        }

        const updateResult = await this.#userRepository.update(user.id, {
            telegramSelectedChat: chat ? {
                ...chat,
                user: user
            } : undefined
        });

        if (updateResult?.ok)
            result.succeeded();

        return result;
    }

    async setUserMode(userId: User['id'], tgMode: UserModeType) {
        const result = new OperationResult().failed("errorOccurred");

        const updateResult = await this.#userRepository.update(userId, {
            telegramMode: tgMode
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

    async setStatusByTelegramId(tgId: number, status: UserStatus) {
        const user = await this.#userRepository.getBy({
            telegram: { id: tgId },
            isDeleted: false,
        });

        if (!user)
            return new OperationResult().failed();

        return this.setUserStatus(user.id, status);
    }

    async setUserPhoneNumber(userId: User['id'], telegramPhoneNumber: string, setStatus = false) {
        const result = new OperationResult();

        const updateResult = await this.#userRepository.update(userId, {
            telegramPhoneNumber: telegramPhoneNumber,
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

    async getUserFileProcessingStatus(userId: string) {
        const result = new OperationResult();

        const fromDate = new Date();
        fromDate.setMinutes(fromDate.getMinutes() - config.fileProcessingLimit.timePeriod);

        const count = await this.#promptRepository.countUserFileUsage(userId, fromDate);

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
            usages,
            recentlyJoinedUsers,
            todayJoinedUsersCount,
        ] = await Promise.all([
            this.#userRepository.countAll(),
            this.#promptRepository.getUsage(todayStart, todayEnd),
            this.#userRepository.getRecentlyInserted(10),
            this.#userRepository.countRecentlyInserted(todayStart),
        ]);

        return {
            usersCount,
            recentlyJoinedUsers,
            todayJoinedUsersCount,
            messageUsage: {
                ...usages,
                cost: usages?.cost.toFixed(2),
                topUsers: usages?.topUsers || [],
            }
        };
    }

    getUserInfo(opts: { id: string }): Promise<UserInfoModel | null>;
    getUserInfo(opts: { tgId: number }): Promise<UserInfoModel | null>;
    getUserInfo(opts: { tgUsername: string }): Promise<UserInfoModel | null>;
    async getUserInfo(opts: { id: string } | { tgId: number } | { tgUsername: string }): Promise<UserInfoModel | null> {
        let user: User | null = null;

        if ('tgId' in opts)
            user = await this.#userRepository.getBy({ telegram: { id: opts.tgId } });
        else if ('id' in opts)
            user = await this.#userRepository.getBy({ id: opts.id });
        else if ('tgUsername' in opts)
            user = await this.#userRepository.getBy({ telegram: { username: opts.tgUsername } });

        if (!user)
            return null;

        const result = await this.#userSubscriptionApplication.getActiveSubscriptionsExtendedInfo(user);

        if (!result)
            return {
                user: user,
                dailyFreePoints: null,
                activePurchasedPlans: null,
                paidSubscriptionsRemainingPoints: null,
            };

        const { dailyFreePointStatus } = result;

        return {
            user: user,
            dailyFreePoints: dailyFreePointStatus ? {
                used: dailyFreePointStatus?.used,
                remaining: dailyFreePointStatus?.remaining,
                total: dailyFreePointStatus?.total,
                isSupported: isPhoneNumberSupported(user.telegram?.phoneNumber),
            } : null,
            activePurchasedPlans: result.paidSubscriptions.length,
            paidSubscriptionsRemainingPoints: result.paidSubscriptionsTotalRemainingPoints,
        };
    }

    async getUserById(userId: string): Promise<User | null> {
        return await this.#userRepository.getBy({ id: userId, status: { notEqual: [UserStatus.Banned] }, });
    }

    async getUserByTgId(tgId: number): Promise<User | null> {
        return await this.#userRepository.getBy({ telegram: { id: tgId } });
    }

    async getUserByPhoneNumber(telegramPhoneNumber: string): Promise<User | null> {
        return await this.#userRepository.getBy({ telegram: { phoneNumber: telegramPhoneNumber }, status: { notEqual: [UserStatus.Banned] }, });
    }

    async useInvite(invitedUser: User) {
        const result = new OperationResultWithData<{ inviter: User }>();

        if (this.#inviteLockCache.isLocked(invitedUser.id))
            return result;

        this.#inviteLockCache.lock(invitedUser.id);

        const unlock = () => this.#inviteLockCache.unlock(invitedUser.id);

        if (!(await this.#transaction.start())) {
            unlock();
            return result;
        }

        const rollback = async () => {
            await this.#transaction.rollback();
            unlock();
            return result;
        };

        if (!invitedUser.telegram?.invite || invitedUser.telegram.invite.used || invitedUser.status !== UserStatus.OK)
            return await rollback();

        const inviter = await this.getUserById(invitedUser.telegram.invite.by);
        const setInviteAsUsed = () => this.#userRepository.update(invitedUser.id, { telegramInviteUsed: true });

        if (!inviter) {
            logger.warn(`Inviter '${invitedUser.telegram.invite.by}' of user '${invitedUser.id}' not found! Skipping invite...`);
            await setInviteAsUsed();
            return await rollback();
        }

        const increasedInvitedCount = await this.#userRepository.increaseInviteCount({ id: inviter.id }, 1);

        if (!increasedInvitedCount)
            return await rollback();

        const setUsedResult = await setInviteAsUsed();

        if (setUsedResult?.ok !== true)
            return await rollback();

        await this.#transaction.commit();
        unlock();

        return result.succeeded().setData({ inviter });
    }

    async toggleVoiceResponse(userId: string, activate: boolean) {
        const result = new OperationResult();

        const updateResult = await this.#userRepository.update(userId, {
            voiceResponseActive: activate
        });

        if (updateResult?.ok)
            result.succeeded();

        return result;
    }

    async setVoiceResponseType(userId: string, type: AIVoice) {
        const result = new OperationResult();

        if (!aiVoices.includes(type))
            return result.failed("invalidInput");

        const updateResult = await this.#userRepository.update(userId, {
            voiceResponseType: type
        });

        if (updateResult?.ok)
            result.succeeded();

        return result;
    }

    /** Pass null to unset */
    async setVoiceResponseLanguagePrompt(userId: string, languagePrompt: string | null) {
        const result = new OperationResult();

        const updateResult = await this.#userRepository.update(userId, {
            voiceResponseLanguagePrompt: languagePrompt === null ? undefined : languagePrompt
        });

        if (updateResult?.ok)
            result.succeeded();

        return result;
    }

    /**
     * @description Memory amount none sets save messages to false
     */
    async setMemoryAmount(userId: string, memoryAmount: AIChatHistoryMemory, setSaveMessagesAutomatically = false) {
        const result = new OperationResult();

        if (setSaveMessagesAutomatically !== true && ![AIChatHistoryMemory.Short, AIChatHistoryMemory.Normal, AIChatHistoryMemory.Long].includes(memoryAmount))
            return result.failed("invalidInput");

        const updateResult = (
            setSaveMessagesAutomatically ? (
                await this.#userRepository.update(
                    userId,
                    {
                        memoryAmount,
                        saveMessages: memoryAmount !== AIChatHistoryMemory.None,
                    }
                )
            ) : (
                await this.#userRepository.update(userId, { memoryAmount })
            )
        );

        if (updateResult?.ok)
            result.succeeded();

        return result;
    }

    async setLanguage(user: User, language: string) {
        const result = new OperationResult();

        const _language = language as LangCode;

        if (!langCodes.includes(_language))
            return result.failed("invalidInput");

        if (user.lang === _language)
            result.succeeded("itemChangedSuccessfully");

        const updateResult = await this.#userRepository.update(user.id, { lang: _language });

        if (updateResult?.ok) {
            user.lang = _language; // update memory
            result.succeeded("itemChangedSuccessfully");
        }

        return result;
    }

    async acceptEula(userId: User['id']) {
        let result = new OperationResult();

        const user = await this.getUserById(userId);

        if (!user)
            return result.failed("userNotFound");

        if (user.status !== UserStatus.EULA)
            return result.failed("invalid");

        result = await this.setUserStatus(user.id, UserStatus.OK);

        return result;
    }
}