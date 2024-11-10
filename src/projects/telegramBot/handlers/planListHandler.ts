import tgCall from "../helpers/call.js";
import { UserMode } from "../../../types/enums/userMode.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const planListHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.TextMessage,
    mode: UserMode.General.Normal,
    async handler(context, update) {
        const text = update.message?.text;
        const command = (text ?? "").toLowerCase().slice(1);

        if (!text?.startsWith('/'))
            return null;

        if (command === "plans") {
            const plans = await context.services.openAIPlanApplication.getAllAvailable();

            if (!plans)
                return null;

            await tgCall(
                TelegramMethods.SendMessage,
                {
                    chat_id: update.message?.chat.id,
                    reply_to_message_id: update.message?.message_id,
                    text: "📃",
                    reply_markup: {
                        inline_keyboard: plans.map(plan => [{ text: plan.title, callback_data: `purchasePlan${plan.id}` }])
                    }
                }
            );

            return { shouldContinue: false };
        }

        return null;
    }
}
