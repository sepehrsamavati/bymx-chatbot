import type { ServicesType } from "../../../Container.js";
import type { PopulatedProperty } from "./lib/model.type.js";
import type { UserDBModel } from "../../../../../types/entities/user.js";
import type { OpenAIModelDBModel } from "../../../../../types/entities/openAIModel.js";
import type { IOpenAIChatRepository } from "../../../../../types/contracts/repositories.js";
import type { OpenAIChat, OpenAIChatDBModel } from "../../../../../types/entities/openAIChat.js";

export class OpenAIChatRepository implements IOpenAIChatRepository {
    #databaseConnection;
    constructor(container: ServicesType) {
        this.#databaseConnection = container.databaseConnection;
    }

    async create(chat: OpenAIChatDBModel): Promise<boolean | null> {
        const res = await this.#databaseConnection.models.openAIChat.create({
            insertDate: chat.insertDate,
            isDeleted: chat.isDeleted,
            model: chat.model.id,
            user: chat.user.id
        });
        return Boolean(res?._id);
    }

    async getUserChatById(userId: string, chatId: string): Promise<OpenAIChat | null> {
        const res = await this.#databaseConnection.models.openAIChat.findOne({
            isDeleted: false,
            user: userId,
            _id: chatId
        })
            .populate<{
                user: PopulatedProperty<UserDBModel>;
                model: PopulatedProperty<OpenAIModelDBModel>;
            }>([
                'user',
                'model'
            ])
            .orFail()
            .lean();

        if (!res)
            return null;

        const user = res.user;
        const model = res.model;

        return {
            id: res._id.toString(),
            model: {
                id: model._id.toString(),
                name: model.name,
                pricePmt: model.pricePmt,
                title: model.title,
                type: model.type
            },
            user: {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                lang: user.lang,
                lastActivity: user.lastActivity,
                mode: user.mode,
                status: user.status,
                tgId: user.tgId,
                type: user.type,
                usage: user.usage,
                selectedOaiModel: user.selectedOaiModel,
            }
        };
    }
}