import type { StoredEntity } from "../contracts/entities.js";
import type { GenerationTaskType } from "../enums/generationTaskType.js";
import type { GenerationTaskStatus } from "../enums/generationTaskStatus.js";

export type GenerationTask = {
    internalId: string;
    externalId: string;
    result: unknown;
    type: GenerationTaskType;
    status: GenerationTaskStatus;
}

export type GenerationTaskDBModel = StoredEntity<GenerationTask>;

export type UpdateGenerationTaskModel = Pick<GenerationTask, 'internalId'> & Partial<GenerationTaskDBModel>;
