import type { PlanType } from "../enums/planTypes";
import type { StoredEntity } from "../contracts/entities";
import type { UITextOptionalKey } from "../../projects/core/i18n/UIText";

export type Plan = {
    id: string;
    title: UITextOptionalKey;
    type: PlanType;
    /** Purchase availability */
    available: boolean;
    /** $USD price */
    price: number;
    points: number;
    days: number;
}

export type PlanDBModel = StoredEntity<Plan>;
