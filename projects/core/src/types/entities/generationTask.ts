import type { User } from "./user.js";
import type { AIModel } from "./aiModel.js";
import type { StoredEntity } from "../contracts/entities.js";
import type { UserSubscriptionUsage } from "./userSubscriptionUsage.js";
import type { GenerationTaskType } from "../enums/generationTaskType.js";
import type { GenerationTaskStatus } from "../enums/generationTaskStatus.js";
import { Prompt } from "./prompt.js";

export type GenerationTask = {
    internalId: string;
    externalId: string;
    result: unknown;
    expiry: Date;
    startDate: Date;
    /** Shows when the last status change is occurred - Initial value is the same as start date */
    endDate: Date;
    user: User;
    model: AIModel;
    cost: Prompt['cost'];
    points: Prompt['points'];
    usages: UserSubscriptionUsage[];
    type: GenerationTaskType;
    status: GenerationTaskStatus;
}

export type GenerationTaskDBModel = StoredEntity<GenerationTask>;

export type SearchGenerationTaskModel = { expiryBefore?: Date; } & Partial<Pick<GenerationTaskDBModel, 'internalId' | 'externalId' | 'isDeleted' | 'status' | 'type' | 'model' | 'user'>>;

export type UpdateGenerationTaskModel = Pick<Partial<GenerationTaskDBModel>, 'isDeleted' | 'externalId' | 'result' | 'type' | 'status' | 'startDate' | 'endDate'>;
