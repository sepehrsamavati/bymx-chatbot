import tgCall from "../helpers/call.js";
import emojiIcon from "../helpers/emojiIcon.js";
import { UserMode } from "../../../types/enums/userMode.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const imageGenerateHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.TextMessage,
    mode: UserMode.UserPrompt.ImageGenerationPrompt,
    async handler(context, update) {
        const message = update.message?.text as string;

        if (message.length < 1500) {

            await tgCall(
                TelegramMethods.SendChatAction,
                {
                    chat_id: update.message?.chat.id,
                    action: "upload_photo"
                }
            );

            const imageGenerateResult = await context.services.aiApplication.imageGenerate(context.user, message);

            if (imageGenerateResult.ok) {
                await tgCall(
                    TelegramMethods.SendPhoto,
                    {
                        chat_id: update.message?.chat.id,
                        reply_to_message_id: update.message?.message_id,
                        photo: imageGenerateResult.data.url,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: `${emojiIcon.point} ${imageGenerateResult.data.pointUsage}`, callback_data: "usedPointsForMessage" },
                                    { text: `${emojiIcon.model} Flux`, callback_data: "modelProcessedThisMessage" },
                                    { text: `${emojiIcon.failed} ${context.uiText.cancelImageGeneration}`, callback_data: "panel" }
                                ]
                            ]
                        }
                    }
                );
            } else {
                return {
                    call: {
                        text: imageGenerateResult.message
                    }
                };
            }

        }

        return null;
    }
}
