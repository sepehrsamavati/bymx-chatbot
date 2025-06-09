import mongoose, { FilterQuery } from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { FlattenToIDs } from "../../../types/contracts/entities.js";
import type { IPromptRepository } from "../../../types/contracts/repositories.js";
import type { PromptBasicInfo, PromptDBModel } from "../../../types/entities/prompt.js";
import { userModelDefinition } from "./models/User.js";

export class PromptRepository implements IPromptRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(message: FlattenToIDs<PromptDBModel, 'usages'>): Promise<string | null> {
        const res = await this.#databaseConnection.models.prompt.create({
            cost: message.cost,
            insertDate: message.insertDate,
            isDeleted: message.isDeleted,
            chat: message.chat?.id,
            usages: message.usages,
            points: message.points,
            input: message.input,
            output: message.output,
            saved: message.saved,
            model: message.model,
            promptUser: message.promptUser.id,
            fileId: message.fileId,
            responseTime: message.responseTime,
        });
        return res?._id.toString() || null;
    }
    async getRecentHistory(chatId: string, count: number, cursorPromptId?: string): Promise<PromptBasicInfo[] | null> {
        const query: FilterQuery<PromptDBModel> = {
            isDeleted: false,
            isHidden: false,
            saved: true,
            chat: chatId
        };

        if (cursorPromptId) {
            query._id = { $lt: cursorPromptId }; // Get documents before the cursor ID
        }

        const res = await this.#databaseConnection.models.prompt
            .find(query)
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
            id: item._id.toString(),
            date: item.insertDate.getTime(),
            cost: item.cost,
            input: item.input,
            output: item.output,
            points: item.points,
            saved: item.saved,
            model: item.model,
            fileId: item.fileId,
            responseTime: item.responseTime,
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
        const count = await this.#databaseConnection.models.prompt.countDocuments({
            user: userId,
            fileId: { "$exists": true },
            insertDate: {
                $gte: fromDate
            }
        });

        return count;
    }

    async getUsage(fromDate: Date, toDate: Date): Promise<{ count: number; point: number; cost: number; topUsers: { tgId: number; cost: number; count: number; point: number; }[] } | null> {
        type AggregationResultTotal = { count: number; point: number; cost: number; }[];
        type AggregationResultTopUsers = { _id: mongoose.Types.ObjectId; count: number; point: number; cost: number; user: { _id: unknown; telegram?: { id: number } }[] }[];
        const [resTotal, resPerUser]: [AggregationResultTotal, AggregationResultTopUsers] = await Promise.all([
            this.#databaseConnection.models.prompt.aggregate([
                {
                    $match: {
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
            ]).exec(),
            this.#databaseConnection.models.prompt.aggregate([
                {
                    $match: {
                        insertDate: {
                            $gte: fromDate,
                            $lte: toDate
                        }
                    }
                },
                {
                    $group: {
                        _id: "$promptUser",
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
                },
                {
                    $sort:
                    {
                        count: -1
                    }
                },
                {
                    $limit: 10
                },
                {
                    $lookup:
                    {
                        from: userModelDefinition.collection,
                        localField: "_id",
                        foreignField: "_id",
                        as: "user" satisfies keyof AggregationResultTopUsers[number],
                        pipeline: [
                            {
                                $project: {
                                    "telegram.id": 1
                                }
                            }
                        ]
                    }
                }
            ]).exec()
        ]);

        if (resTotal.length > 1)
            throw new Error("Prompt get message usage by date range errored (multiple aggregation result returned)");

        const usage = resTotal.at(0);

        return {
            ...(usage ?? {
                cost: 0,
                count: 0,
                point: 0,
            }),
            topUsers: resPerUser?.length
                ? resPerUser
                    .filter(item => item.user.length === 1 && item.user[0].telegram?.id)
                    .map(item => ({
                        tgId: item.user[0].telegram!.id,
                        point: item.point,
                        cost: item.cost,
                        count: item.count,
                    }))
                : []
        };
    }

    async deleteByChatId(chatId: string): Promise<boolean | null> {
        await this.#databaseConnection.models
            .prompt
            .updateMany({
                isDeleted: false,
                chat: chatId,
            }, {
                isDeleted: true
            });
        return true;
    }

    async deleteAfter(chatId: string, cursorPromptId: string): Promise<boolean | null> {
        await this.#databaseConnection.models
            .prompt
            .updateMany({
                isDeleted: false,
                chat: chatId,
                _id: {
                    $gte: cursorPromptId
                }
            }, {
                isDeleted: true,
            });
        return true;
    }
}