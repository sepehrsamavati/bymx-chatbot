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
    async create(task: { userId: string; modelId: string; usages: string[]; } & Partial<Pick<GenerationTask, 'status' | 'result'>> & Pick<GenerationTask, 'startDate' | 'endDate' | 'expiry' | 'internalId' | 'externalId' | 'type' | 'promptInfo'>) {
        const result = new OperationResultWithData<string>();

        const created = await this.#generationTaskRepository.create({
            insertDate: new Date(),
            startDate: task.startDate,
            endDate: task.endDate,
            isDeleted: false,
            internalId: task.internalId,
            externalId: task.externalId,
            expiry: task.expiry,
            result: task.result ?? null,
            status: task.status ?? GenerationTaskStatus.InProgress,
            type: task.type,
            usages: task.usages,
            user: task.userId,
            model: task.modelId,
            promptInfo: task.promptInfo,
        });

        if (created)
            result.succeeded().setData(created);

        return result;
    }

    async getUserInProgressTasksCount(userId: string) {
        const result = new OperationResultWithData<number>();

        const count = await this.#generationTaskRepository.count({
            user: userId,
            isDeleted: false,
            status: GenerationTaskStatus.InProgress,
        });

        if (Number.isInteger(count))
            result.succeeded().setData(count);

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

    /**
     * 
     * @param internalId 
     * @param result 
     * @param task Pass to update reference value when DB call is successful
     * @returns 
     */
    async setCompleted(internalId: string, result: unknown = null, task?: GenerationTask) {
        const _result = new OperationResult();

        const nowAsEndDate = new Date();

        if (await this.#generationTaskRepository.updateOne({ internalId }, {
            result,
            status: GenerationTaskStatus.OK,
            endDate: nowAsEndDate,
        })) {
            _result.succeeded();
            if (task) {
                task.result = result;
                task.status = GenerationTaskStatus.OK;
                task.endDate = nowAsEndDate;
            }
        }

        return _result;
    }

    /**
     * 
     * @param internalId 
     * @param result 
     * @param task Pass to update reference value when DB call is successful
     * @returns 
     */
    async setErrored(internalId: string, result: unknown = null, task?: GenerationTask) {
        const _result = new OperationResult();

        const nowAsEndDate = new Date();

        if (await this.#generationTaskRepository.updateOne({ internalId }, {
            result,
            status: GenerationTaskStatus.Error,
            endDate: nowAsEndDate,
        })) {
            _result.succeeded();
            if (task) {
                task.result = result;
                task.status = GenerationTaskStatus.Error;
                task.endDate = nowAsEndDate;
            }
        }

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

    async getByInternalId(internalId: string) {
        const result = new OperationResultWithData<GenerationTask>();

        const task = await this.#generationTaskRepository.getOne({ isDeleted: false, internalId });

        if (task)
            result.succeeded().setData(task);

        return result;
    }
}