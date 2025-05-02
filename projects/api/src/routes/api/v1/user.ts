import { UserEntity } from "bymx-core/types";
import { config, crypto } from "bymx-core/server";
import type { RouteHandlerMethod } from "fastify";
import { signToken } from "../../../helpers/jwtHelper.js";
import ChangeLanguage from "../../../dto/user/ChangeLanguage.js";
import type TelegramAuth from "../../../dto/user/TelegramAuth.js";
import sendMessageToUser from "bymx-tg-endpoint/sendMessageToUser";
import TelegramOtpLogin from "../../../dto/user/TelegramOtpLogin.js";
import { createSetCookieString } from "../../../helpers/cookieHelper.js";
import TelegramOtpRequest from "../../../dto/user/TelegramOtpRequest.js";
import { OperationResult, OperationResultWithData, stringHelper, UIText } from "bymx-core/shared";

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

        const cookie = createSetCookieString(config.apiServer.cookieKey, await signToken(userInfo, config.apiServer.tokenSignSecret, 120 * 60e3), 120 * 60);
        reply.header('Set-Cookie', cookie);
    }
    else
        result.failed("userNotFound");

    return reply.status(200).send(result);

};

export const changeLanguage: RouteHandlerMethod = async (request, reply) => {

    let result = new OperationResult();

    if (!request.locals.user)
        return reply.status(200).send(result.failed("noAccess"));

    const user = await request.locals.applications.userApplication.getUserById(request.locals.user.id);

    if (!user)
        return reply.status(200).send(result.failed("noAccess"));

    result = await request.locals.applications.userApplication.setLanguage(user, (request.locals.dto as ChangeLanguage).lang);

    return reply.status(200).send(result);

};

export const getMe: RouteHandlerMethod = async (request, reply) => {

    let result = new OperationResultWithData<UserEntity.UserViewModel>();

    if (!request.locals.user)
        return reply.status(200).send(result.failed("noAccess"));

    const user = await request.locals.applications.userApplication.getUserById(request.locals.user.id);

    if (!user)
        return reply.status(200).send(result.failed("noAccess"));

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

    return reply.status(200).send(result);

};

export const getInfo: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<UserEntity.UserInfoViewModel>();

    if (!request.locals.user)
        return reply.status(200).send(result.failed("noAccess"));

    const info = await request.locals.applications.userApplication.getUserInfo({ id: request.locals.user.id });

    if (info)
        result
            .succeeded()
            .setData({
                user: {
                    id: info.user.id,
                    firstName: info.user.telegram?.firstName ?? "",
                    lastName: info.user.telegram?.lastName ?? "",
                    lang: info.user.lang,
                    memoryAmount: info.user.memoryAmount,
                    saveMessages: info.user.saveMessages,
                    type: info.user.type,
                },
                activePurchasedPlans: info.activePurchasedPlans,
                dailyFreePoints: info.dailyFreePoints,
                paidSubscriptionsRemainingPoints: info.paidSubscriptionsRemainingPoints,
            });

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

export const telegramOtpAuth: RouteHandlerMethod = async (request, reply) => {

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

        result.succeeded().setData(userInfo);

        const cookie = createSetCookieString(config.apiServer.cookieKey, await signToken(userInfo, config.apiServer.tokenSignSecret, 120 * 60e3), 120 * 60);
        reply.header('Set-Cookie', cookie);
    }
    else
        result.failed("invalidInput");

    return reply.status(200).send(result);

};
