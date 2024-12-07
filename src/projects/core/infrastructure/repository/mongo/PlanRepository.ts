import type { FilterQuery } from "mongoose";
import type { MongoStored } from "./lib/model.type.js";
import type { ServicesType } from "../../../Container.js";
import type { IPlanRepository } from "../../../../../types/contracts/repositories.js";
import type { Plan, PlanDBModel, SearchPlan } from "../../../../../types/entities/plan.js";

export class PlanRepository implements IPlanRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async getById(id: Plan["id"]): Promise<Plan | null> {
        const res = (
            await this.#databaseConnection.models.plan
                .findOne({ _id: id, isDeleted: false })
                .lean()
        );
        return res ? {
            id: res._id.toString(),
            available: res.available,
            type: res.type,
            days: res.days,
            points: res.points,
            price: res.price,
            title: res.title
        } : null;
    }

    async getMany(filter: SearchPlan): Promise<Plan[] | null> {
        const _filter: FilterQuery<MongoStored<PlanDBModel>> = { isDeleted: false };

        if (typeof filter.available === "boolean")
            _filter.available = filter.available;

        if (filter.isDeleted !== undefined)
            _filter.isDeleted = filter.isDeleted;

        if (filter.type !== undefined)
            _filter.type = filter.type;

        const res = (
            await this.#databaseConnection.models.plan
                .find(_filter)
                .lean()
        )
            .map(item => ({
                id: item._id.toString(),
                title: item.title,
                available: item.available,
                days: item.days,
                points: item.points,
                price: item.price,
                type: item.type,
            } satisfies Plan));
        return res;
    }
}