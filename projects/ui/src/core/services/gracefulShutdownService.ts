import HttpClient from "../helper/HttpClient";
import type { OperationResult, OperationResultWithData, UIText } from "bymx-core/shared";

const gracefulShutdownService = Object.freeze({
    shouldShutdown() {
        return HttpClient.send<OperationResult>({
            path: "/api/v1/shutdown",
            method: HttpClient.Methods.POST,
        });
    },
    getRequestsInfo() {
        return HttpClient.send<OperationResultWithData<{ activeRequests: number; lastRequestStart: number; }>>({
            path: "/api/v1/requests",
            method: HttpClient.Methods.GET,
        });
    },
});

export default gracefulShutdownService;
