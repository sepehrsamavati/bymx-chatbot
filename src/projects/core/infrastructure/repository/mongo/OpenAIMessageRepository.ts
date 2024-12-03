import mongoose from "mongoose";
import type { ServicesType } from "../../../Container.js";
import { openAIChatModelDefinition } from "./models/OpenAIChat.js";
import type { IOpenAIMessageRepository } from "../../../../../types/contracts/repositories.js";
import type { OpenAIMessageBasicInfo, OpenAIMessageDBModel } from "../../../../../types/entities/openAIMessage.js";

export class OpenAIMessageRepository implements IOpenAIMessageRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(message: OpenAIMessageDBModel): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.openAIMessage.create({
            cost: message.cost,
            insertDate: message.insertDate,
            isDeleted: message.isDeleted,
            chat: message.chat.id,
            subscription: message.subscription.id,
            points: message.points,
            output: message.output,
            prompt: message.prompt,
            saved: message.saved,
            model: message.model,
            promptUser: message.promptUser.id,
            fileId: message.fileId
        });
        return Boolean(res?._id);
    }

    async getPlanPointUsage(planId: string): Promise<number | null> {
        type AggregationResult = { _id: null; sum: number; }[] | undefined;
        const res = (
            await this.#databaseConnection.models.openAIMessage
                .aggregate([
                    {
                        $match: {
                            isDeleted: false,
                            plan: new mongoose.Types.ObjectId(planId)
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            sum: {
                                $sum: "$points"
                            }
                        }
                    }
                ])
        ) as AggregationResult;

        if (!res || res.length === 0)
            return 0;

        if (res.length !== 1)
            throw new Error("Invalid aggregation result");

        const _userPointUsage = res[0].sum;

        return _userPointUsage;
    }

    // async getFreePointUsage(userId: string, fromDate: Date, toDate: Date): Promise<number | null> {
    //     type AggregationResult = { _id: null; sum: number; }[] | undefined;
    //     const res = (
    //         await this.#databaseConnection.models.openAIMessage
    //             .aggregate([
    //                 {
    //                     $match: {
    //                         isDeleted: false,
    //                         plan: {
    //                             $exists: false,
    //                         },
    //                         insertDate: {
    //                             $gte: fromDate,
    //                             $lte: toDate
    //                         }
    //                     }
    //                 },
    //                 {
    //                     $lookup: {
    //                         from: openAIChatModelDefinition.collection,
    //                         localField: "chat" satisfies keyof OpenAIMessageDBModel,
    //                         foreignField: "_id",
    //                         as: "_chat",
    //                         pipeline: [
    //                             {
    //                                 $match: {
    //                                     user: new mongoose.Types.ObjectId(userId),
    //                                 }
    //                             }
    //                         ]
    //                     }
    //                 },
    //                 {
    //                     $unwind: "$_chat"
    //                 },
    //                 {
    //                     $group: {
    //                         _id: null,
    //                         sum: {
    //                             $sum: "$points"
    //                         }
    //                     }
    //                 }
    //             ])
    //     ) as AggregationResult;

    //     if (!res || res.length === 0)
    //         return 0;

    //     if (res.length !== 1)
    //         throw new Error("Invalid aggregation result");

    //     const _userPointUsage = res[0].sum;

    //     return _userPointUsage;
    // }

    async getRecentHistory(chatId: string, count: number): Promise<OpenAIMessageBasicInfo[] | null> {
        const res = await this.#databaseConnection.models.openAIMessage
            .find({
                isDeleted: false,
                isHidden: false,
                saved: true,
                chat: chatId
            })
            .sort({ insertDate: -1 })
            .limit(count)
            // .populate<{
            //     chat: PopulatedProperty<OpenAIChatDBModel>;
            //     plan: PopulatedProperty<OpenAIPlanDBModel>;
            // }>([
            //     "chat",
            //     "plan"
            // ] satisfies Array<keyof OpenAIMessage>)
            .lean()
            .exec();

        if (!res)
            return null;

        return res.map(item => ({
            cost: item.cost,
            prompt: item.prompt,
            output: item.output,
            points: item.points,
            saved: item.saved,
            model: item.model,
            fileId: item.fileId,
            // chat: {
            //     id: item.chat._id.toString(),
            //     title: item.chat.title,
            //     isHidden: item.chat.isHidden,
            //     model: item.chat.model,
            //     user: item.chat.user,
            //     behavior: item.chat.behavior
            // },
            // plan: item.plan ? {
            //     id: item.plan._id.toString(),
            //     available: item.plan.available,
            //     days: item.plan.days,
            //     points: item.plan.points,
            //     price: item.plan.price,
            //     title: item.plan.title,
            // } : undefined
        }));
    }

    async countUserFileUsage(userId: string, fromDate: Date): Promise<number | null> {
        const count = await this.#databaseConnection.models.openAIMessage.countDocuments({
            user: userId,
            fileId: { "$exists": true },
            insertDate: {
                $gte: fromDate
            }
        });

        return count;
    }

    async getUsage(fromDate: Date, toDate: Date): Promise<{ count: number; point: number; cost: number; } | null> {
        type AggregationResult = { count: number; point: number; cost: number; }[];
        const res: AggregationResult = await this.#databaseConnection.models.openAIMessage.aggregate([
            {
                $match: {
                    isDeleted: false,
                    insertDate: {
                        $gte: fromDate,
                        $lte: toDate
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    count: {
                        $sum: 1
                    },
                    point: {
                        $sum: "$points"
                    },
                    cost: {
                        $sum: "$cost"
                    }
                }
            }
        ]).exec();

        if (res.length > 1)
            throw new Error("OpenAI get message usage by date range errored (multiple aggregation result returned)");

        const usage = res.at(0);

        return usage ?? {
            cost: 0,
            count: 0,
            point: 0
        };
    }
}