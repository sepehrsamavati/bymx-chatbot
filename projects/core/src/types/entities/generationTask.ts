import type { User } from "./user.js";
import type { StoredEntity } from "../contracts/entities.js";
import type { UserSubscriptionUsage } from "./userSubscriptionUsage.js";
import type { GenerationTaskType } from "../enums/generationTaskType.js";
import type { GenerationTaskStatus } from "../enums/generationTaskStatus.js";

export type GenerationTask = {
    internalId: string;
    externalId: string;
    result: unknown;
    user: User;
    usages: UserSubscriptionUsage[];
    type: GenerationTaskType;
    status: GenerationTaskStatus;
}

export type GenerationTaskDBModel = StoredEntity<GenerationTask>;

export type SearchGenerationTaskModel = Partial<Omit<GenerationTaskDBModel, 'result' | 'usages'>>;

export type UpdateGenerationTaskModel = Pick<GenerationTask, 'internalId'> & Pick<Partial<GenerationTaskDBModel>, 'externalId' |'result' | 'type' | 'status'>;
