import HttpClient from "../helper/HttpClient";
import type { IOperationResultWithData, UserSubscriptionEntity } from "bymx-core/types";

const subscriptionService = Object.freeze({
    getAll() {
        return HttpClient.send<IOperationResultWithData<UserSubscriptionEntity.UserSubscriptionViewModel[]>>({
            path: "/api/v1/subscription/all",
            method: HttpClient.Methods.GET,
        });
    },
});

export default subscriptionService;
