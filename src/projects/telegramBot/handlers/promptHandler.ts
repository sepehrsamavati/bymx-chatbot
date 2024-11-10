import { UserMode } from "../../../types/enums/userMode.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const promptHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.TextMessage,
    mode: UserMode.General.Normal,
    async handler(context, update) {
        const text = update.message?.text as string;

        const res = await context.services.openAIApplication.textMessage(context.user, text);

        if (!res)
            return null;

        return {
            call: {
                text: res
            }
        }
    }
}
