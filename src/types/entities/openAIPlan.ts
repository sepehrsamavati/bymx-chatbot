import type { StoredEntity } from "../contracts/entities";
import type { UITextOptionalKey } from "../../projects/core/i18n/UIText";

export type OpenAIPlan = {
    id: string;
    title: UITextOptionalKey;
    /** $USD price */
    price: number;
    points: number;
    days: number;
}

export type StoredOpenAIPlan = StoredEntity<OpenAIPlan>;
