import HttpClient from "../helper/HttpClient";
import type { IOperationResult, IOperationResultWithData, UserEntity } from "bymx-core/types";

const userService = Object.freeze({
    telegramAuth(initData: string) {
        return HttpClient.send<IOperationResultWithData<UserEntity.UserViewModel>>({
            path: "/api/v1/user/tgAuth",
            method: HttpClient.Methods.POST,
            body: { initData },
        });
    },
    changeLanguage(langCode: string) {
        return HttpClient.send<IOperationResult>({
            path: "/api/v1/user/language",
            method: HttpClient.Methods.PATCH,
            body: { lang: langCode },
        });
    },
    /** @todo */
    logout() {
        return HttpClient.send<null>({
            path: "/api/v1/user/logout",
            method: HttpClient.Methods.GET
        });
    },
});

export default userService;
