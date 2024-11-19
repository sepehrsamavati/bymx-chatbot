import fs from "node:fs/promises";
import config from "../config.js";
import type { ServicesType } from "../Container.js";
import { errorLogger, logger } from "../helpers/logger.js";
import { getTempFilePath } from "../helpers/storageHelper.js";
import type { UserTempFile } from "../../../types/entities/userTempFile.js";
import { OperationResult, OperationResultWithData } from "../common/dto/OperationResult.js";

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

    async setOpenAiInfo(fsId: UserTempFile['fsId'], update: Pick<Required<UserTempFile>, 'openAiFileId' | 'vectorIds'>) {
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

    async deleteInactiveFiles() {
        const result = new OperationResult();

        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() - config.tempFileCleanupAge);

        const inactiveFiles = await this.#userTempFileRepository.getInactive(expiry, 100);

        if (!inactiveFiles)
            return result.failed();

        for (const tempFile of inactiveFiles) {
            const filePath = getTempFilePath(tempFile);

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