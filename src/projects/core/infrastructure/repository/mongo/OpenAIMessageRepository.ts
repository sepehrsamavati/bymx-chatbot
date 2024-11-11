import mongoose from "mongoose";
import type { ServicesType } from "../../../Container.js";
import type { OpenAIMessageDBModel } from "../../../../../types/entities/openAIMessage.js";
import type { IOpenAIMessageRepository } from "../../../../../types/contracts/repositories.js";
import { openAIChatModelDefinition } from "./models/OpenAIChat.js";

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
            plan: message.plan?.id,
            points: message.points,
            output: message.output,
            prompt: message.prompt,
            saved: message.saved,
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

    async getFreePointUsage(userId: string, fromDate: Date, toDate: Date): Promise<number | null> {
        type AggregationResult = { _id: null; sum: number; }[] | undefined;
        const res = (
            await this.#databaseConnection.models.openAIMessage
                .aggregate([
                    {
                        $match: {
                            isDeleted: false,
                            plan: {
                                $exists: false,
                            },
                            insertDate: {
                                $gte: fromDate,
                                $lt: toDate
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: openAIChatModelDefinition.collection,
                            localField: "chat" satisfies keyof OpenAIMessageDBModel,
                            foreignField: "_id",
                            as: "_chat",
                            pipeline: [
                                {
                                    $match: {
                                        user: new mongoose.Types.ObjectId(userId),
                                    }
                                }
                            ]
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
}