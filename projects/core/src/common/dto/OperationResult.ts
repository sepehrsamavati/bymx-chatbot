import type { UITextOptionalKey } from "../../i18n/UIText.js";
import type { IOperationResult, IOperationResultWithData } from "../../types/contracts/operationResult.js";

export class OperationResult implements IOperationResult {
    public ok = false;
    public message: UITextOptionalKey = "";

    public succeeded(message?: UITextOptionalKey) {
        this.ok = true;
        if (message)
            this.message = message;
        else
            this.message = "operationSuccessful";
        return this;
    }

    public failed(message?: UITextOptionalKey) {
        this.ok = false;
        if (message)
            this.message = message;
        else
            this.message = "operationFailed";
        return this;
    }
}

export class OperationResultWithData<T> extends OperationResult implements IOperationResultWithData<T> {
    public data: T | null = null;

    public setData(data: IOperationResultWithData<T>['data']) {
        this.data = data;
        return this;
    }
}
