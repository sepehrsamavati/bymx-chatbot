import type { User } from "./user.js";
import type { StoredEntity } from "../contracts/entities.js";
import type { UserSubscriptionUsage } from "./userSubscriptionUsage.js";
import type { GenerationTaskType } from "../enums/generationTaskType.js";
import type { GenerationTaskStatus } from "../enums/generationTaskStatus.js";

export type GenerationTask = {
    internalId: string;
    externalId: string;
    result: unknown;
    expiry: Date;
    user: User;
    usages: UserSubscriptionUsage[];
    type: GenerationTaskType;
    status: GenerationTaskStatus;
}

export type GenerationTaskDBModel = StoredEntity<GenerationTask>;

export type SearchGenerationTaskModel = { expiryBefore?: Date; } & Partial<Omit<GenerationTaskDBModel, 'result' | 'usages' | 'expiry'>>;

export type UpdateGenerationTaskModel = Pick<Partial<GenerationTaskDBModel>, 'isDeleted' | 'externalId' | 'result' | 'type' | 'status'>;
