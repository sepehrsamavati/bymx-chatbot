import { randomUUID } from "node:crypto";
import type { ServicesType } from "../Container.js";
import type { GenerationTask } from "../types/entities/generationTask.js";
import { GenerationTaskStatus } from "../types/enums/generationTaskStatus.js";
import { OperationResult, OperationResultWithData } from "../export/shared.js";

export default class GenerationTaskApplication {
    #generationTaskRepository;

    constructor(container: ServicesType) {
        this.#generationTaskRepository = container.generationTaskRepository;
    }

    /** Use to generate UUID before calling create */
    newId() {
        return randomUUID();
    }

    /** Get internal id from `newId` function */
    async create(task: { userId: string; usages: string[]; } & Pick<GenerationTask, 'startDate' | 'endDate' | 'expiry' | 'internalId' | 'externalId' | 'type'>) {
        const result = new OperationResult();

        const created = await this.#generationTaskRepository.create({
            insertDate: new Date(),
            startDate: task.startDate,
            endDate: task.endDate,
            isDeleted: false,
            internalId: task.internalId,
            externalId: task.externalId,
            expiry: task.expiry,
            result: null,
            status: GenerationTaskStatus.InProgress,
            type: task.type,
            usages: task.usages,
            user: task.userId,
        });

        if (created === true)
            result.succeeded();

        return result;
    }

    async getInProgress(opts: {
        internalId: string;
        externalId: string;
    }) {
        const result = new OperationResultWithData<GenerationTask>().failed("itemNotFound");

        const task = await this.#generationTaskRepository.getOne({
            isDeleted: false,
            internalId: opts.internalId,
            externalId: opts.externalId,
            status: GenerationTaskStatus.InProgress,
        });

        if (task)
            result.succeeded().setData(task);

        return result;
    }

    async setCompleted(internalId: string, result: unknown = null) {
        const _result = new OperationResult();

        if (await this.#generationTaskRepository.updateOne({ internalId }, {
            result,
            status: GenerationTaskStatus.OK,
            endDate: new Date(),
        }))
            _result.succeeded();

        return _result;
    }

    async setErrored(internalId: string, result: unknown = null) {
        const _result = new OperationResult();

        if (await this.#generationTaskRepository.updateOne({ internalId }, {
            result,
            status: GenerationTaskStatus.Error,
            endDate: new Date(),
        }))
            _result.succeeded();

        return _result;
    }

    async markExpiredItems() {
        const _result = new OperationResult();

        if (await this.#generationTaskRepository.updateMany({
            expiryBefore: new Date(),
            status: GenerationTaskStatus.InProgress,
        }, {
            status: GenerationTaskStatus.Expired,
            endDate: new Date(),
        }))
            _result.succeeded();

        return _result;
    }
}