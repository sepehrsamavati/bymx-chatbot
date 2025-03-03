import { config, crypto } from "bymx-core/server";
import type { RouteHandlerMethod } from "fastify";
import type TelegramAuth from "../../../dto/TelegramAuth.js";

export const telegramAuth: RouteHandlerMethod = async (request, reply) => {

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

    return reply.status(200).send({
        ok: computedHash === tgAuthData.hash,
        calculatedHash: computedHash,
        authData: tgAuthData,
    });

};
