import type { ServicesType } from "../../../Container.js";
import { openAIModelModelDefinition } from "./models/OpenAIModel.js";
import type { FilterQuery, FlattenMaps, UpdateQuery } from "mongoose";
import { OpenAIChat } from "../../../../../types/entities/openAIChat.js";
import { FlattenToIDs } from "../../../../../types/contracts/entities.js";
import type { IUserRepository } from "../../../../../types/contracts/repositories.js";
import type { MongoStored, MongoStoredWithId, PopulatedProperty } from "./lib/model.type.js";
import type { User, UserDBModel, CreateUserModel, UpdateUserModel, SearchUserModel } from "../../../../../types/entities/user.js";
import MongoSearchHelper from "./lib/SearchHelper.js";

export default class UserRepository implements IUserRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
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
        const _update: UpdateQuery<UserDBModel> = {};

        if (update.username !== undefined)
            _update.username = update.username;

        if (update.firstName !== undefined)
            _update.firstName = update.firstName;

        if (update.lastName !== undefined)
            _update.lastName = update.lastName;

        if (update.isDeleted !== undefined)
            _update.isDeleted = update.isDeleted;

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

        if (Object.hasOwn(update, 'selectedChat')) {
            if (update.selectedChat !== undefined)
                _update.selectedChat = update.selectedChat.id;
            else
                _update.$unset = { selectedChat: 1 };
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
            phoneNumber: result.phoneNumber
        };

        const selectedChat = result.selectedChat as any as PopulatedProperty<FlattenToIDs<OpenAIChat, 'user'>>;

        if (selectedChat && user.id === selectedChat.user.toString()) {
            const chatModel = selectedChat.model as PopulatedProperty<OpenAIChat['model']>;
            user.selectedChat = {
                id: selectedChat._id.toString(),
                model: {
                    id: chatModel._id.toString(),
                    name: chatModel.name,
                    pricePmu: chatModel.pricePmu,
                    title: chatModel.title,
                    type: chatModel.type,
                    assistants: chatModel.assistants
                },
                title: selectedChat.title,
                behavior: selectedChat.behavior,
                isHidden: selectedChat.isHidden,
                user: user
            };
        }

        return user;
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
                            model: openAIModelModelDefinition.model
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

        const result = await this.#databaseConnection.models.user.updateOne(_filter, _update).lean().exec();

        return {
            ok: result.modifiedCount === 1
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
}