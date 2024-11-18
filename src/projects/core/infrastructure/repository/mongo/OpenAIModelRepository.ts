import type { ServicesType } from "../../../Container.js";
import type { OpenAIModel } from "../../../../../types/entities/openAIModel.js";
import type { IOpenAIModelRepository } from "../../../../../types/contracts/repositories.js";

export class OpenAIModelRepository implements IOpenAIModelRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async getAll(): Promise<OpenAIModel[] | null> {
        const res = (
            await this.#databaseConnection.models.openAIModel
                .find({ isDeleted: false })
                .lean()
        )
            .map(item => ({
                id: item._id.toString(),
                name: item.name,
                pricePmu: item.pricePmu,
                title: item.title,
                type: item.type,
                assistants: item.assistants
            } satisfies OpenAIModel));
        return res;
    }

    async getById(id: string): Promise<OpenAIModel | null> {
        const res = await this.#databaseConnection.models.openAIModel
            .findOne({ _id: id, isDeleted: false })
            .lean();;
        return res ? {
            id: res._id.toString(),
            name: res.name,
            pricePmu: res.pricePmu,
            title: res.title,
            type: res.type,
            assistants: res.assistants
        } : null;
    }

    async exists(id: OpenAIModel["id"]): Promise<boolean | null> {
        const res = (
            await this.#databaseConnection.models.openAIModel
                .exists({ id, isDeleted: false })
        );
        return Boolean(res?._id);
    }
}