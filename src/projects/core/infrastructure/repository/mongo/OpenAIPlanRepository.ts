import type { FilterQuery } from "mongoose";
import type { MongoStored } from "./lib/model.type.js";
import type { ServicesType } from "../../../Container.js";
import type { IOpenAIPlanRepository } from "../../../../../types/contracts/repositories.js";
import type { OpenAIPlan, OpenAIPlanDBModel } from "../../../../../types/entities/openAIPlan.js";

export class OpenAIPlanRepository implements IOpenAIPlanRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async getById(id: OpenAIPlan["id"]): Promise<OpenAIPlan | null> {
        const res = (
            await this.#databaseConnection.models.openAIPlan
                .findOne({ id, isDeleted: false })
                .lean()
        );
        return res ? {
            id: res._id.toString(),
            available: res.available,
            days: res.days,
            points: res.points,
            price: res.price,
            title: res.title
        } : null;
    }

    async getMany(filter: Pick<Partial<OpenAIPlanDBModel>, "available">): Promise<OpenAIPlan[] | null> {
        const _filter: FilterQuery<MongoStored<OpenAIPlanDBModel>> = { isDeleted: false };

        if (typeof filter.available === "boolean")
            _filter.available = filter.available;

        const res = (
            await this.#databaseConnection.models.openAIPlan
                .find(_filter)
                .lean()
        )
            .map(item => ({
                id: item._id.toString(),
                title: item.title,
                available: item.available,
                days: item.days,
                points: item.points,
                price: item.price
            } as OpenAIPlan));
        return res;
    }
}