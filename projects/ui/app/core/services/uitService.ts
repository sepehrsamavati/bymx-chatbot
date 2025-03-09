import HttpClient from "../helper/HttpClient";
import type { OperationResultWithData, UIText } from "bymx-core/shared";

const uitService = Object.freeze({
    getLanguageData(langCode: string) {
        return HttpClient.send<OperationResultWithData<UIText.UITextLanguage>>({
            path: `/api/v1/uiText/${langCode}`,
            method: HttpClient.Methods.GET,
        });
    },
});

export default uitService;
