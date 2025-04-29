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
    getMe() {
        return HttpClient.send<IOperationResultWithData<UserEntity.UserViewModel>>({
            path: "/api/v1/user/me",
            method: HttpClient.Methods.GET,
        });
    },
    getProfile() {
        return HttpClient.send<IOperationResultWithData<UserEntity.UserInfoViewModel>>({
            path: "/api/v1/user/info",
            method: HttpClient.Methods.GET,
        });
    },
    requestTelegramOtp(phoneNumber: string) {
        return HttpClient.send<IOperationResult>({
            path: "/api/v1/user/tgOtp",
            method: HttpClient.Methods.POST,
            body: { phoneNumber }
        });
    },
    telegramOtpAuth(phoneNumber: string, otp: string) {
        return HttpClient.send<IOperationResultWithData<UserEntity.UserViewModel>>({
            path: "/api/v1/user/tgOtpAuth",
            method: HttpClient.Methods.POST,
            body: { phoneNumber, otp }
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
