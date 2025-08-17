import HttpClient from "../helper/HttpClient";
import type { IOperationResult, IOperationResultWithData, PlanEntity } from "bymx-core/types";

const planService = Object.freeze({
    getAll() {
        return HttpClient.send<IOperationResultWithData<PlanEntity.PlanViewModel[]>>({
            path: "/api/v1/plan/all",
            method: HttpClient.Methods.GET,
        });
    },
    purchaseViaWallet(planId: string) {
        return HttpClient.send<IOperationResult>({
            path: "/api/v1/plan/purchaseViaWallet",
            doNotAutoRetry: true,
            method: HttpClient.Methods.POST,
            body: {
                id: planId,
            },
        });
    },
});

export default planService;
