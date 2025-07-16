import { UserEntity } from "bymx-core/types";
import type { RouteHandlerMethod } from "fastify";
import ChangeLanguage from "../../../dto/user/ChangeLanguage.js";
import SetMemoryAmount from "../../../dto/user/SetMemoryAmount.js";
import { OperationResult, OperationResultWithData } from "bymx-core/shared";

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

    result.succeeded().setData(request.locals.applications.userApplication.toViewModel(user));

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
                user: request.locals.applications.userApplication.toViewModel(info.user),
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

export const acceptEula: RouteHandlerMethod = async (request, reply) => {

    let result = new OperationResult();

    if (!request.locals.user)
        return reply.status(200).send(result.failed("noAccess"));

    result = await request.locals.applications.userApplication.acceptEula(request.locals.user.id);

    return reply.status(200).send(result);

};
