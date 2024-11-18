import type { ServicesType } from "../Container.js";
import { OperationResult, OperationResultWithData } from "../common/dto/OperationResult.js";
import type { UserTempFile } from "../../../types/entities/userTempFile.js";

export default class UserTempFileApplication {
    #userTempFileRepository;
    constructor(container: ServicesType) {
        this.#userTempFileRepository = container.userTempFileRepository;
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
}