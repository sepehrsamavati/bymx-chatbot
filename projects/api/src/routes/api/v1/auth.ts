import { UserEntity } from "bymx-core/types";
import { config, crypto } from "bymx-core/server";
import type { RouteHandlerMethod } from "fastify";
import type TelegramAuth from "../../../dto/user/TelegramAuth.js";
import sendMessageToUser from "bymx-tg-endpoint/sendMessageToUser";
import TelegramOtpLogin from "../../../dto/user/TelegramOtpLogin.js";
import TelegramOtpRequest from "../../../dto/user/TelegramOtpRequest.js";
import { OperationResult, OperationResultWithData, stringHelper, UIText } from "bymx-core/shared";

export const telegramAuth: RouteHandlerMethod = async function (request, reply) {

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

        if (!user.telegram?.phoneNumber)
            return reply.status(200).send(result.failed("sendPhoneNumberToContinue"));

        const userInfo: UserEntity.UserViewModel = {
            id: user.id,
            type: user.type,
            lang: user.lang,
            firstName: user.telegram?.firstName ?? "",
            lastName: user.telegram?.lastName ?? "",
            memoryAmount: user.memoryAmount,
            saveMessages: user.saveMessages,
        };

        result.succeeded().setData(userInfo);

        const accessToken = this.jwt.sign(
            userInfo,
            { expiresIn: '15m' } // Short-lived
        );

        const refreshToken = this.jwt.sign(
            { userId: user.id },
            { expiresIn: '60d' } // Long-lived
        );

        reply.setCookie(config.apiServer.accessTokenCookieKey, accessToken, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            domain: config.apiServer.domain,
            maxAge: 900 // 15 minutes
        });

        reply.setCookie(config.apiServer.refreshTokenCookieKey, refreshToken, {
            path: '/api/v1/auth/refresh',
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            domain: config.apiServer.domain,
            maxAge: 5184000 // 60 days
        });
    }
    else
        result.failed("userNotFound");

    return reply.status(200).send(result);

};

export const sendTelegramOtp: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResult();

    const query = request.locals.dto as TelegramOtpRequest;

    query.phoneNumber = query.phoneNumber.replace('+', '');

    const user = await request.locals.applications.userApplication.getUserByPhoneNumber(query.phoneNumber);

    if (!user)
        return reply.status(200).send(result.failed("makeSureThePhoneNumberIsCorrect"));

    const codeGenerateResult = await request.locals.applications.telegramOtpApplication.generateOtp(user);

    if (!codeGenerateResult.ok)
        return reply.status(200).send(result.failed(codeGenerateResult.message));

    if (!codeGenerateResult.data)
        return reply.status(200).send(result.succeeded(codeGenerateResult.message));

    const sendResult = await sendMessageToUser(user, stringHelper.formatter(UIText.default[user.lang].yourOtpForLogin, codeGenerateResult.data));

    if (sendResult?.ok)
        result.succeeded();

    return reply.status(200).send(result);

};

export const telegramOtpAuth: RouteHandlerMethod = async function (request, reply) {

    const result = new OperationResultWithData<UserEntity.UserViewModel>();

    const query = request.locals.dto as TelegramOtpLogin;

    query.phoneNumber = query.phoneNumber.replace('+', '');

    const user = await request.locals.applications.userApplication.getUserByPhoneNumber(query.phoneNumber);

    if (!user)
        return reply.status(200).send(result.failed("makeSureThePhoneNumberIsCorrect"));

    const otpAuthResult = await request.locals.applications.telegramOtpApplication.useOtp(user.id, query.otp);

    if (otpAuthResult.ok) {
        const userInfo: UserEntity.UserViewModel = {
            id: user.id,
            type: user.type,
            lang: user.lang,
            firstName: user.telegram?.firstName ?? "",
            lastName: user.telegram?.lastName ?? "",
            memoryAmount: user.memoryAmount,
            saveMessages: user.saveMessages,
        };

        const accessToken = this.jwt.sign(
            userInfo,
            { expiresIn: '15m' } // Short-lived
        );

        const refreshToken = this.jwt.sign(
            { userId: user.id },
            { expiresIn: '60d' } // Long-lived
        );

        reply.setCookie(config.apiServer.accessTokenCookieKey, accessToken, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            domain: config.apiServer.domain,
            maxAge: 900 // 15 minutes
        });

        reply.setCookie(config.apiServer.refreshTokenCookieKey, refreshToken, {
            path: '/api/v1/auth/refresh',
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            domain: config.apiServer.domain,
            maxAge: 5184000 // 60 days
        });

        result.succeeded().setData(userInfo);
    }
    else
        result.failed("invalidInput");

    return reply.status(200).send(result);

};

export const logout: RouteHandlerMethod = async (_, reply) => {
    const result = new OperationResult();

    reply.clearCookie(config.apiServer.accessTokenCookieKey);
    reply.clearCookie(config.apiServer.refreshTokenCookieKey);

    result.succeeded();

    return reply.status(200).send(result);
};

export const refreshAccessToken: RouteHandlerMethod = async function (request, reply) {
    const result = new OperationResult();

    const refreshToken = request.cookies[config.apiServer.refreshTokenCookieKey];
    if (!refreshToken) return reply.status(200).send(result.failed());

    const decoded = this.jwt.verify(refreshToken);
    if (!(
        typeof decoded === "object" && ('userId' in decoded)
        && typeof decoded.userId === "string"
    ))
        return reply.status(200).send(result.failed());

    const user = await request.locals.applications.userApplication.getUserById(decoded.userId);

    if (!user)
        return reply.status(200).send(result.failed());

    const newAccessToken = this.jwt.sign(
        {
            id: user.id,
            firstName: user.telegram?.firstName || "",
            lastName: user.telegram?.lastName || "",
            lang: user.lang,
            memoryAmount: user.memoryAmount,
            saveMessages: user.saveMessages,
            type: user.type,
        } satisfies UserEntity.UserViewModel,
        { expiresIn: '15m' }
    );

    reply.setCookie(config.apiServer.accessTokenCookieKey, newAccessToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        domain: config.apiServer.domain,
        maxAge: 900 // 15 minutes
    });

    result.succeeded();

    return reply.status(200).send(result);
};
