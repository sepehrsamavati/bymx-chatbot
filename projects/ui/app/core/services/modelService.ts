import HttpClient from "../helper/HttpClient";
import type { AiModelEntity } from "bymx-core/types";
import type { OperationResult, OperationResultWithData } from "bymx-core/shared";

const modelService = Object.freeze({
    getAll() {
        return HttpClient.send<OperationResultWithData<AiModelEntity.AIModelViewModel[]>>({
            path: "/api/v1/model/allViewModel",
            method: HttpClient.Methods.GET,
        });
    },
    getAllRaw() {
        return HttpClient.send<OperationResultWithData<AiModelEntity.AIModel[]>>({
            path: "/api/v1/model/raw",
            method: HttpClient.Methods.GET,
        });
    },
    update(id: string, update: Partial<AiModelEntity.AIModel>) {
        return HttpClient.send<OperationResult>({
            path: "/api/v1/model/",
            method: HttpClient.Methods.PATCH,
            body: {
                ...update,
                id,
            },
        });
    },
    refresh() {
        return HttpClient.send<OperationResult>({
            path: "/api/v1/model/refresh",
            method: HttpClient.Methods.POST,
        });
    },
});

export default modelService;
