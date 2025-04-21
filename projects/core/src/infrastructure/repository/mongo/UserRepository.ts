import mongoose from "mongoose";
import { Transactional } from "./lib/Context.js";
import MongoSearchHelper from "./lib/SearchHelper.js";
import type { ServicesType } from "../../../Container.js";
import { AIChat } from "../../../types/entities/aiChat.js";
import { aiModelModelDefinition } from "./models/AIModel.js";
import { FlattenToIDs } from "../../../types/contracts/entities.js";
import type { FilterQuery, FlattenMaps, UpdateQuery } from "mongoose";
import type { IUserRepository } from "../../../types/contracts/repositories.js";
import type { MongoStored, MongoStoredWithId, PopulatedProperty } from "./lib/model.type.js";
import type { User, UserDBModel, CreateUserModel, UpdateUserModel, SearchUserModel } from "../../../types/entities/user.js";

export default class UserRepository extends Transactional implements IUserRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        super(container);
        this.#databaseConnection = container.databaseConnection;
    }

    async create(user: CreateUserModel): Promise<User["id"] | null> {
        const result = await this.#databaseConnection.models.user.create(user);
        return result ? result._id.toString() : null;
    }

    #getFilter(filter: SearchUserModel) {
        const _filter: FilterQuery<MongoStored<UserDBModel>> = {
            isDeleted: filter.isDeleted ?? false
        };

        if (filter.id !== undefined)
            _filter._id = filter.id;

        if (filter.tgId !== undefined)
            _filter.tgId = filter.tgId;

        if (filter.phoneNumber !== undefined)
            _filter.phoneNumber = filter.phoneNumber;

        if (filter.username !== undefined)
            _filter.username = MongoSearchHelper.exactStringCaseInsensitive(filter.username);

        if (filter.status?.equal || filter.status?.notEqual) {
            _filter.status = {
                ...(filter.status.equal ? {
                    $in: filter.status.equal
                } : undefined),
                ...(filter.status.notEqual ? {
                    $nin: filter.status.notEqual
                } : undefined),
            };
        }

        return _filter;
    }

    #getUpdate(update: UpdateUserModel) {
        const unsetList: Array<string> = [];
        const _update: UpdateQuery<UserDBModel> = {};

        if (update.username !== undefined)
            _update.username = update.username;

        if (update.firstName !== undefined)
            _update.firstName = update.firstName;

        if (update.lastName !== undefined)
            _update.lastName = update.lastName;

        if (update.isDeleted !== undefined)
            _update.isDeleted = update.isDeleted;

        if (update.lang !== undefined)
            _update.lang = update.lang;

        if (update.mode !== undefined)
            _update.mode = update.mode;

        if (update.status !== undefined)
            _update.status = update.status;

        if (update.type !== undefined)
            _update.type = update.type;

        if (update.saveMessages !== undefined)
            _update.saveMessages = update.saveMessages;

        if (update.phoneNumber !== undefined)
            _update.phoneNumber = update.phoneNumber;

        if (update.memoryAmount !== undefined)
            _update.memoryAmount = update.memoryAmount;

        if (update.inviteUsed !== undefined)
            _update["invite.used"] = update.inviteUsed;

        if (update.voiceResponseActive !== undefined)
            _update["voiceResponse.on"] = update.voiceResponseActive;

        if (update.voiceResponseType !== undefined)
            _update["voiceResponse.type"] = update.voiceResponseType;

        if (Object.hasOwn(update, 'voiceResponseLanguagePrompt')) {
            if (update.voiceResponseLanguagePrompt !== undefined)
                _update["voiceResponse.languagePrompt"] = update.voiceResponseLanguagePrompt;
            else
                unsetList.push("voiceResponse.languagePrompt");
        }

        if (Object.hasOwn(update, 'selectedChat')) {
            if (update.selectedChat !== undefined)
                _update.selectedChat = update.selectedChat.id;
            else
                unsetList.push("selectedChat");
        }

        if (unsetList.length) {
            _update.$unset = {};
            for (const key of unsetList) {
                _update.$unset[key] = 1;
            }
        }

        return _update;
    }

    #storedToView(result?: FlattenMaps<MongoStoredWithId<UserDBModel>> | null): User | null {

        if (!result)
            return null;

        const user: User = {
            id: result._id.toString(),
            firstName: result.firstName,
            lastName: result.lastName,
            username: result.username,
            status: result.status,
            usage: result.usage,
            mode: result.mode,
            lang: result.lang,
            lastActivity: result.lastActivity,
            tgId: result.tgId,
            type: result.type,
            saveMessages: result.saveMessages,
            memoryAmount: result.memoryAmount,
            phoneNumber: result.phoneNumber,
            inviteCount: result.inviteCount,
            invite: result.invite,
            voiceResponse: result.voiceResponse,
        };

        const selectedChat = result.selectedChat as any as PopulatedProperty<FlattenToIDs<AIChat, 'user'>> | mongoose.Types.ObjectId;

        if (selectedChat && !(selectedChat instanceof mongoose.Types.ObjectId) && user.id === selectedChat.user.toString()) {
            const chatModel = selectedChat.model as PopulatedProperty<AIChat['model']>;
            user.selectedChat = {
                id: selectedChat._id.toString(),
                model: {
                    id: chatModel._id.toString(),
                    isDeleted: chatModel.isDeleted,
                    name: chatModel.name,
                    pricePmu: chatModel.pricePmu,
                    title: chatModel.title,
                    type: chatModel.type,
                    llmInfo: chatModel.llmInfo,
                    provider: chatModel.provider,
                },
                title: selectedChat.title,
                behavior: selectedChat.behavior,
                isHidden: selectedChat.isHidden,
                user: user,
            };
        }

        return user;
    }

    async getRecentlyInserted(count: number): Promise<User[] | null> {
        const res = await this.#databaseConnection.models.user
            .find()
            .sort({ insertDate: -1 })
            .limit(count);

        return res?.map(user => this.#storedToView(user) as User) ?? null;
    }

    async countRecentlyInserted(fromDate: Date): Promise<number | null> {
        const res = await this.#databaseConnection.models.user.countDocuments({
            insertDate: {
                $gte: fromDate
            }
        });
        return res;
    }

    async getBy(filter: SearchUserModel): Promise<User | null> {
        const _filter = this.#getFilter(filter);
        const result = await this.#databaseConnection.models.user.findOne(_filter)
            .populate('selectedChat' satisfies keyof User)
            .lean().exec();
        return this.#storedToView(result);
    }

    async getAndUpdate(update: UpdateUserModel, filter: SearchUserModel): ReturnType<IUserRepository["getBy"]> {
        const _filter = this.#getFilter(filter);

        const _update: UpdateQuery<UserDBModel> = {
            lastActivity: Date.now(),
            $inc: { usage: 1 },
            ...this.#getUpdate(update)
        };

        const result = await this.#databaseConnection.models.user
            .findOneAndUpdate(_filter, _update)
            .populate(
                {
                    path: 'selectedChat' satisfies keyof User,
                    populate: [
                        {
                            path: 'model',
                            model: aiModelModelDefinition.model
                        }
                    ]
                },
            )
            .lean().exec();

        return this.#storedToView(result);
    }

    async update(id: UserDBModel['id'], update: UpdateUserModel) {
        const _filter = this.#getFilter({ id });
        const _update = this.#getUpdate(update);

        const result = await this.#databaseConnection.models.user.updateOne(_filter, _update, { session: this.transaction.session }).lean().exec();

        return {
            ok: Boolean(result)
        };
    }

    async countAll(): Promise<number | null> {
        const count = await this.#databaseConnection.models.user.countDocuments();
        return count;
    }

    async getTgIds(filter: SearchUserModel): Promise<number[] | null> {
        const _filter = this.#getFilter(filter);
        const result = await this.#databaseConnection.models.user
            .find(_filter)
            .select('tgId' satisfies keyof User)
            .lean().exec();

        if (!result)
            return null;

        return result.map(item => item.tgId);
    }

    async increaseInviteCount(filter: SearchUserModel, amount: number): Promise<boolean | null> {
        const _filter = this.#getFilter(filter);

        const _update: UpdateQuery<UserDBModel> = {
            $inc: { inviteCount: amount },
        };

        const result = await this.#databaseConnection.models.user.updateMany(_filter, _update, { session: this.transaction.session });

        return Boolean(result);
    }
}