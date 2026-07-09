import HttpClient from "../helper/HttpClient";
import type { IOperationResult } from "bymx-core/types";

const fileService = Object.freeze({
    deleteAttachment(id: string) {
        return HttpClient.send<IOperationResult>({
            path: "/api/v1/file/attachment",
            method: HttpClient.Methods.DELETE,
            body: { id },
        });
    },
});

export default fileService;
