import type { FilterQuery } from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { IUserTempFileRepository } from "../../../../../types/contracts/repositories.js";
import type { CreateUserTempFile, SearchUserTempFile, UpdateUserTempFile, UserTempFile } from "../../../../../types/entities/userTempFile.js";

export class UserTempFileRepository implements IUserTempFileRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(userTempFile: CreateUserTempFile): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.userTempFile.create({
            insertDate: userTempFile.insertDate,
            isDeleted: userTempFile.isDeleted,
            extension: userTempFile.extension,
            fsId: userTempFile.fsId,
            openAiFileId: userTempFile.openAiFileId,
            size: userTempFile.size,
            tgId: userTempFile.tgId,
            tgUniqueId: userTempFile.tgUniqueId,
            vectorIds: userTempFile.vectorIds,
            user: userTempFile.user
        });
        return Boolean(res?._id);
    }

    async get(filter: SearchUserTempFile): Promise<Omit<UserTempFile, "user"> | null> {
        const _filter: FilterQuery<UserTempFile> = {};

        if (filter.user !== undefined)
            _filter.user = filter.user;

        if (filter.fsId !== undefined)
            _filter.fsId = filter.fsId;

        if (filter.isDeleted !== undefined)
            _filter.isDeleted = filter.isDeleted;

        if (filter.tgId !== undefined)
            _filter.tgId = filter.tgId;

        if (filter.tgUniqueId !== undefined)
            _filter.tgUniqueId = filter.tgUniqueId;

        const res = await this.#databaseConnection.models.userTempFile.findOne(_filter).lean().exec();

        return res ? {
            extension: res.extension,
            fsId: res.fsId,
            tgId: res.tgId,
            size: res.size,
            tgUniqueId: res.tgUniqueId,
            openAiFileId: res.openAiFileId,
            vectorIds: res.vectorIds
        } : null;
    }

    async updateById(update: UpdateUserTempFile): Promise<boolean | null> {
        const _update: FilterQuery<UserTempFile> = {
            fsId: update.id
        };

        if (update.isDeleted !== undefined)
            _update.isDeleted = update.isDeleted;

        if (update.openAiFileId !== undefined)
            _update.openAiFileId = update.openAiFileId;

        if (update.vectorIds !== undefined)
            _update.vectorIds = update.vectorIds;

        const res = await this.#databaseConnection.models.userTempFile.updateOne(_update).lean().exec();

        return res.modifiedCount === 1;
    }
}