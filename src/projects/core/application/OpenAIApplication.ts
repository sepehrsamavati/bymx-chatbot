import type { ServicesType } from "../Container.js";
import type { User } from "../../../types/entities/user.js";

export default class OpenAIApplication {
    #openAI;

    constructor(container: ServicesType) {
        this.#openAI = container.openAI;
    }

    async textMessage(user: User, message: string) {
        return await this.#openAI.simpleMessage(message, user.id);
    }
}