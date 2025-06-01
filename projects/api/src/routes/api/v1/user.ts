import { UserEntity } from "bymx-core/types";
import type { RouteHandlerMethod } from "fastify";
import ChangeLanguage from "../../../dto/user/ChangeLanguage.js";
import sendMessageToUser from "bymx-tg-endpoint/sendMessageToUser";
import SetMemoryAmount from "../../../dto/user/SetMemoryAmount.js";
import TelegramOtpRequest from "../../../dto/user/TelegramOtpRequest.js";
import { OperationResult, OperationResultWithData, stringHelper, UIText } from "bymx-core/shared";

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

export const setMemoryAmount: RouteHandlerMethod = async (request, reply) => {
    const userId = request.locals.user?.id!;
    const query = request.locals.dto as SetMemoryAmount;

    const result = await request.locals.applications.userApplication.setMemoryAmount(userId, query.amount, true);

    return reply.status(200).send(result);
};
