import HttpClient from "../helper/HttpClient";
import type { CaptionOnly } from "bymx-core/types";
import type { OperationResultWithData } from "bymx-core/shared";

const modelService = Object.freeze({
    getAll() {
        return HttpClient.send<OperationResultWithData<CaptionOnly[]>>({
            path: "/api/v1/model/all",
            method: HttpClient.Methods.GET,
        });
    },
});

export default modelService;
