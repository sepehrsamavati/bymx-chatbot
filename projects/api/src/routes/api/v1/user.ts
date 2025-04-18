import { UserEntity } from "bymx-core/types";
import { config, crypto } from "bymx-core/server";
import type { RouteHandlerMethod } from "fastify";
import { signToken } from "../../../helpers/jwtHelper.js";
import { OperationResultWithData } from "bymx-core/shared";
import type TelegramAuth from "../../../dto/TelegramAuth.js";
import { createSetCookieString } from "../../../helpers/cookieHelper.js";

export const telegramAuth: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<UserEntity.UserViewModel>();

    const dataValidationResult = {
        tgUserId: 0,
        isValid: false,
        authDate: new Date(),
    };

    try {
        const tgAuthData = request.locals.dto as TelegramAuth;

        const botToken = config.telegram.apiToken;

        const parsedParams = [...new URLSearchParams(tgAuthData.initData).entries()];

        const receivedHash = parsedParams.find(([key]) => key === "hash")?.[1];

        const secretKey = crypto.calculateSha256Hash('WebAppData', botToken);

        const dataCheckString = parsedParams
            .filter(([key]) => key !== "hash") // remove hash
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const computedHash = crypto.calculateSha256Hash(secretKey, dataCheckString).toString("hex");

        if (receivedHash === computedHash) {
            const _tgUserId = JSON.parse(parsedParams.find(([key]) => key === "user")?.[1] || "{}")?.id;
            const authDate = new Date(Number.parseInt((parsedParams.find(([key]) => key === "auth_date")?.[1] ?? "") + "000") ?? "");

            if (typeof _tgUserId === "number") {
                dataValidationResult.tgUserId = _tgUserId;
                dataValidationResult.authDate = authDate;
                dataValidationResult.isValid = true;
            }
        }
    } catch { }

    if (!dataValidationResult.isValid)
        return reply.status(200).send(result.failed("invalid"));

    if (Date.now() - dataValidationResult.authDate.getTime() > 300e3 /* 5min */)
        return reply.status(200).send(result.failed("dataExpired"));

    const user = await request.locals.applications.userApplication.getUserByTgId(dataValidationResult.tgUserId);

    if (user) {

        if(!user.phoneNumber)
            return reply.status(200).send(result.failed("sendPhoneNumberToContinue"));
        
        const userInfo: UserEntity.UserViewModel = {
            id: user.id,
            type: user.type,
            lang: user.lang,
            firstName: user.firstName,
            lastName: user.lastName,
            memoryAmount: user.memoryAmount,
            saveMessages: user.saveMessages,
        };

        result.succeeded().setData(userInfo);

        const cookie = createSetCookieString("Auth", await signToken(userInfo, "test", 120 * 60e3), 120 * 60);
        reply.header('Set-Cookie', cookie);
    }
    else
        result.failed("userNotFound");

    return reply.status(200).send(result);

};
