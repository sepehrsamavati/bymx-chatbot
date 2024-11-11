import type { ServicesType } from "../../../Container.js";
import type { PopulatedProperty } from "./lib/model.type.js";
import type { CaptionOnly } from "../../../../../types/contracts/entities.js";
import type { OpenAIModelDBModel } from "../../../../../types/entities/openAIModel.js";
import type { IOpenAIChatRepository } from "../../../../../types/contracts/repositories.js";
import type { OpenAIChat, OpenAIChatDBModel } from "../../../../../types/entities/openAIChat.js";

export class OpenAIChatRepository implements IOpenAIChatRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(chat: Omit<OpenAIChatDBModel, 'id'>): Promise<OpenAIChatDBModel['id'] | null> {
        const res = await this.#databaseConnection.models.openAIChat.create({
            insertDate: chat.insertDate,
            isDeleted: chat.isDeleted,
            model: chat.model.id,
            user: chat.user.id,
            title: chat.title,
        });
        return res?._id.toString() || null;
    }

    async getUserChatById(userId: string, chatId: string): Promise<Omit<OpenAIChat, 'user'> | null> {
        const res = await this.#databaseConnection.models.openAIChat.findOne({
            isDeleted: false,
            user: userId,
            _id: chatId
        })
            .populate<{
                model: PopulatedProperty<OpenAIModelDBModel>;
            }>([
                'model'
            ])
            .orFail()
            .lean();

        if (!res)
            return null;

        const model = res.model;

        return {
            id: res._id.toString(),
            title: res.title,
            model: {
                id: model._id.toString(),
                name: model.name,
                pricePmt: model.pricePmt,
                title: model.title,
                type: model.type
            }
        };
    }

    async getUserChats(userId: string): Promise<CaptionOnly[] | null> {
        const res = await this.#databaseConnection.models.openAIChat.find({
            isDeleted: false,
            user: userId,
        })
            .lean();

        if (!res)
            return null;

        return res.map(item => ({ id: item._id.toString(), caption: item.title }));
    }

    async exists(userId: string): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.openAIChat.exists({
            user: userId,
            isDeleted: false
        });
        return Boolean(res?._id);
    }
}