import { config, crypto } from "bymx-core/server";
import type { RouteHandlerMethod } from "fastify";
import type TelegramAuth from "../../../dto/TelegramAuth.js";
import { OperationResultWithData } from "bymx-core/shared";
import { UserEntity } from "bymx-core/types";
import { signToken } from "../../../helpers/jwtHelper.js";
import { createSetCookieString } from "../../../helpers/cookieHelper.js";

export const telegramAuth: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<UserEntity.UserViewModel>();

    const tgAuthData = request.locals.dto as TelegramAuth;

    const botToken = config.telegram.apiToken;

    const secretKey = crypto.calculateSha256Hash(botToken, 'WebAppData');

    const queryParams = {
        user_id: tgAuthData.tgId,
        auth_date: tgAuthData.date,
    };

    const sortedKeys = Object.keys(queryParams).sort();
    const dataCheckString = sortedKeys
        .map(key => `${key}=${queryParams[key as keyof typeof queryParams]}`)
        .join('\n');

    const computedHash = crypto.calculateSha256Hash(secretKey, dataCheckString);

    /** @todo */
    const user = await request.locals.applications.userApplication.getUserByTgId(tgAuthData.tgId);

    if (user) {
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

        const cookie = createSetCookieString("Auth", await signToken(userInfo, "test", 5 * 60e3), 5 * 60);
        reply.header('Set-Cookie', cookie);
    }
    else
        result.failed("userNotFound");

    return reply.status(200).send(result);

};
