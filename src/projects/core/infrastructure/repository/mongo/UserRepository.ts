import type { ServicesType } from "../../../Container.js";
import { openAIModelModelDefinition } from "./models/OpenAIModel.js";
import type { FilterQuery, FlattenMaps, UpdateQuery } from "mongoose";
import { OpenAIChat } from "../../../../../types/entities/openAIChat.js";
import { FlattenToIDs } from "../../../../../types/contracts/entities.js";
import type { IUserRepository } from "../../../../../types/contracts/repositories.js";
import type { MongoStored, MongoStoredWithId, PopulatedProperty } from "./lib/model.type.js";
import type { User, UserDBModel, CreateUserModel, UpdateUserModel } from "../../../../../types/entities/user.js";

export default class UserRepository implements IUserRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(user: CreateUserModel): Promise<User["id"] | null> {
        const result = await this.#databaseConnection.models.user.create(user);
        return result ? result._id.toString() : null;
    }

    #getFilter(filter: Partial<UserDBModel>) {
        const _filter: FilterQuery<MongoStored<UserDBModel>> = {
            isDeleted: filter.isDeleted ?? false
        };

        if (filter.id !== undefined)
            _filter._id = filter.id;

        if (filter.tgId !== undefined)
            _filter.tgId = filter.tgId;

        if (filter.username !== undefined)
            _filter.username = filter.username;

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

        if (update.type !== undefined)
            _update.type = update.type;

        if (update.saveMessages !== undefined)
            _update.saveMessages = update.saveMessages;

        if (update.memoryAmount !== undefined)
            _update.memoryAmount = update.memoryAmount;

        if (update.selectedChat !== undefined)
            _update.selectedChat = update.selectedChat.id;

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
            memoryAmount: result.memoryAmount
        };

        const selectedChat = result.selectedChat as any as PopulatedProperty<FlattenToIDs<OpenAIChat, 'user'>>;

        if (selectedChat && user.id === selectedChat.user.toString()) {
            const chatModel = selectedChat.model as PopulatedProperty<OpenAIChat['model']>;
            user.selectedChat = {
                id: selectedChat._id.toString(),
                model: {
                    id: chatModel._id.toString(),
                    name: chatModel.name,
                    pricePmt: chatModel.pricePmt,
                    title: chatModel.title,
                    type: chatModel.type
                },
                title: selectedChat.title,
                isHidden: selectedChat.isHidden,
                user: user
            };
        }

        return user;
    }

    async getBy(filter: Pick<Partial<UserDBModel>, 'id' | 'tgId' | 'isDeleted'>): Promise<User | null> {
        const _filter = this.#getFilter(filter);
        const result = await this.#databaseConnection.models.user.findOne(_filter)
            .populate('selectedChat' satisfies keyof User)
            .lean().exec();
        return this.#storedToView(result);
    }

    async getAndUpdate(update: UpdateUserModel, filter: Pick<User, "id"> | Pick<User, "tgId">): ReturnType<IUserRepository["getBy"]> {
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
}