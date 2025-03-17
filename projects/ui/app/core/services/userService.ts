import HttpClient from "../helper/HttpClient";
import type { IOperationResultWithData, UserEntity } from "bymx-core/types";

const userService = Object.freeze({
    telegramAuth(tgId: number) {
        return HttpClient.send<IOperationResultWithData<UserEntity.UserViewModel>>({
            path: "/api/v1/user/tgAuth",
            method: HttpClient.Methods.POST,
            body: { tgId, date: 1, hash: "none" },
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
