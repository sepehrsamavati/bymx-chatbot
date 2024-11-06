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
                pricePmt: item.pricePmt,
                title: item.title,
                type: item.type
            } as OpenAIModel));
        return res;
    }

    async exists(id: OpenAIModel["id"]): Promise<boolean | null> {
        const res = (
            await this.#databaseConnection.models.openAIModel
                .exists({ id, isDeleted: false })
        );
        return Boolean(res?._id);
    }
}