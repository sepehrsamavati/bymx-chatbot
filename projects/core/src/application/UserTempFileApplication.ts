import fs from "node:fs/promises";
import config from "../config.js";
import type { ServicesType } from "../Container.js";
import { errorLogger, logger } from "../helpers/logger.js";
import { fileStorageHelper } from "../helpers/storageHelper.js";
import type { UserTempFile } from "../types/entities/userTempFile.js";
import { OperationResult, OperationResultWithData } from "../common/dto/OperationResult.js";
import { FlattenToIDs } from "../types/contracts/entities.js";

export default class UserTempFileApplication {
    #userTempFileRepository;
    #openAiService;
    constructor(container: ServicesType) {
        this.#userTempFileRepository = container.userTempFileRepository;
        this.#openAiService = container.openAI;
    }

    async addTempFile(userTempFile: UserTempFile) {
        const result = new OperationResult();

        if (await this.#userTempFileRepository.create({
            ...userTempFile,
            insertDate: new Date(),
            isDeleted: false,
            user: userTempFile.user.id,
        }))
            result.succeeded();

        return result;
    }

    async getByFsId(fsId: UserTempFile['fsId']) {
        const result = new OperationResultWithData<FlattenToIDs<UserTempFile, 'user'>>();

        const res = await this.#userTempFileRepository.get({
            isDeleted: false,
            fsId: fsId,
        });

        if (res)
            result.succeeded().setData(res);

        return result;
    }

    async getByTgUniqueId(id: UserTempFile['tgUniqueId']) {
        const result = new OperationResultWithData<Omit<UserTempFile, 'user'>>();

        const res = await this.#userTempFileRepository.get({
            isDeleted: false,
            tgUniqueId: id
        });

        if (res)
            result.succeeded().setData(res);

        return result;
    }

    async setOpenAiInfo(fsId: UserTempFile['fsId'], update: Pick<Partial<UserTempFile>, 'openAiFileId' | 'vectorIds'>) {
        const result = new OperationResult();

        const res = await this.#userTempFileRepository.updateById({
            id: fsId,
            vectorIds: update.vectorIds,
            openAiFileId: update.openAiFileId,
        });

        if (res)
            result.succeeded();

        return result;
    }

    async getUserUsageStatus(userId: string) {
        const result = new OperationResult();

        const fromDate = new Date();
        fromDate.setMinutes(fromDate.getMinutes() - config.fileUploadLimit.timePeriod);

        const count = await this.#userTempFileRepository.countUserUsage(userId, fromDate);

        if (count === null || Number.isNaN(count))
            return result.failed("errorOccurred");

        if (count >= config.fileUploadLimit.count)
            return result.failed("fileUploadLimitReached");

        return result.succeeded();
    }

    async deleteByFsId(fsId: string) {
        const result = new OperationResult();

        const file = await this.#userTempFileRepository.get({
            isDeleted: false,
            fsId: fsId,
        });

        if (!file)
            return result.failed("itemNotFound");

        const filePath = fileStorageHelper.userTemporary.getFilePath(file.fsId);

        const [
            fsUnlinkResult,
            updateResult
        ] = await Promise.allSettled([
            fs.unlink(filePath),
            this.#userTempFileRepository.updateById({
                id: file.fsId,
                isDeleted: true,
            })
        ]);

        if (fsUnlinkResult.status === "rejected")
            errorLogger(`UserTempFileApp / deleteByFsId / Error while deleting file '${filePath}'`, fsUnlinkResult.reason);

        if (updateResult.status === "rejected")
            errorLogger(`UserTempFileApp / deleteByFsId / Error while updating inactive file status / FsId: '${file.fsId}'`, updateResult.reason);

        return result.succeeded();
    }

    async deleteInactiveFiles() {
        const result = new OperationResult();

        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() - config.tempFileCleanupAge);

        const inactiveFiles = await this.#userTempFileRepository.getInactive(expiry, 100);

        if (!inactiveFiles)
            return result.failed();

        for (const tempFile of inactiveFiles) {
            const filePath = fileStorageHelper.userTemporary.getFilePath(tempFile.fsId);

            const [
                fsUnlinkResult,
                updateResult
            ] = await Promise.allSettled([
                fs.unlink(filePath),
                this.#userTempFileRepository.updateById({
                    id: tempFile.fsId,
                    isDeleted: true,
                })
            ]);

            if (fsUnlinkResult.status === "rejected")
                errorLogger(`UserTempFileApp / Error while deleting file '${filePath}'`, fsUnlinkResult.reason);

            if (updateResult.status === "rejected")
                errorLogger(`UserTempFileApp / Error while updating inactive file status / FsId: '${tempFile.fsId}'`, updateResult.reason);

            if (tempFile.openAiFileId) {
                const res = await this.#openAiService.deleteFileById(tempFile.openAiFileId);
                if (!res.ok)
                    logger.error(`UserTempFileApp / Error while deleting file '${tempFile.openAiFileId}' / ${res.message}`);
            }

            for (const vectorId of tempFile.vectorIds) {
                const res = await this.#openAiService.deleteVectorById(vectorId);
                if (!res.ok)
                    logger.error(`UserTempFileApp / Error while deleting OpenAI vector '${vectorId}' / ${res.message}`);
            }
        }

        return result;
    }
}