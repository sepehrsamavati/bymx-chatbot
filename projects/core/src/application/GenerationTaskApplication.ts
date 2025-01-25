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

    async create(task: { userId: string; usages: string[]; } & Pick<GenerationTask, 'expiry' | 'externalId' | 'type'>) {
        const result = new OperationResultWithData<string>();
        const internalId = randomUUID();

        const created = await this.#generationTaskRepository.create({
            insertDate: new Date(),
            isDeleted: false,
            internalId: internalId,
            externalId: task.externalId,
            expiry: task.expiry,
            result: null,
            status: GenerationTaskStatus.InProgress,
            type: task.type,
            usages: task.usages,
            user: task.userId,
        });

        if (created === true)
            result.succeeded().setData(internalId);

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
        }))
            _result.succeeded();

        return _result;
    }

    async setErrored(internalId: string, result: unknown = null) {
        const _result = new OperationResult();

        if (await this.#generationTaskRepository.updateOne({ internalId }, {
            result,
            status: GenerationTaskStatus.Error,
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
        }))
            _result.succeeded();

        return _result;
    }
}