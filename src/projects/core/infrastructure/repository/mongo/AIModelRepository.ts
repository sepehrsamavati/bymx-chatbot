import type { ServicesType } from "../../../Container.js";
import type { AIModel } from "../../../../../types/entities/aiModel.js";
import type { IAIModelRepository } from "../../../../../types/contracts/repositories.js";

export class AIModelRepository implements IAIModelRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async getAll(): Promise<AIModel[] | null> {
        const res = (
            await this.#databaseConnection.models.aiModel
                .find({ isDeleted: false })
                .lean()
        )
            .map(item => ({
                id: item._id.toString(),
                name: item.name,
                pricePmu: item.pricePmu,
                title: item.title,
                type: item.type,
                assistants: item.assistants,
                provider: item.provider,
            } satisfies AIModel));
        return res;
    }

    async getById(id: string): Promise<AIModel | null> {
        const res = await this.#databaseConnection.models.aiModel
            .findOne({ _id: id, isDeleted: false })
            .lean();;
        return res ? {
            id: res._id.toString(),
            name: res.name,
            pricePmu: res.pricePmu,
            title: res.title,
            type: res.type,
            assistants: res.assistants,
            provider: res.provider,
        } : null;
    }

    async exists(id: AIModel["id"]): Promise<boolean | null> {
        const res = (
            await this.#databaseConnection.models.aiModel
                .exists({ id, isDeleted: false })
        );
        return Boolean(res?._id);
    }
}