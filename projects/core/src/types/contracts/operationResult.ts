import type { UITextOptionalKey } from "../../i18n/UIText.js";

export type IOperationResult = {
    ok: boolean;
    message: UITextOptionalKey;
}

export type IOperationResultWithData<T> = {
    ok: boolean;
    message: UITextOptionalKey;
    data: T | null;
}
