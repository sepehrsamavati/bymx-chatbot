import tgCall from "../helpers/call.js";
import { GenerationTaskType, UIText } from "bymx-core/shared";
import { errorLogger } from "bymx-core/server";
import emojiIcon from "../helpers/emojiIcon.js";
import { falAiResultEventBus } from "bymx-core/events";
import type { TelegramUpdateObject } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";

export const cache = new Map<string, {
    internalTaskId: string;
    update: TelegramUpdateObject;
}>();

export const init = (botUsername: string) => {
    falAiResultEventBus.on("internalProcessFinished", async (result, task) => {
        const chatId = task.user.tgId;
        const cachedItem = cache.get(task.internalId);

        const context = {
            uiText: UIText.default[task.user.lang]
        };

        switch (task.type) {
            case GenerationTaskType.FalAiMiniMaxMusicGeneration: {

                const audio = cachedItem?.update.message?.reply_to_message?.audio;

                if (!result.ok || !result.data) {
                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: chatId,
                            text: context.uiText.creatingMusicPleaseWait
                        }
                    );
                    return;
                }

                await tgCall(
                    TelegramMethods.SendChatAction,
                    {
                        chat_id: chatId,
                        action: "upload_voice"
                    }
                );

                const performer = `@${botUsername} - ${result.data.modelName}`;
                const title = audio?.title || `Telegram: @${botUsername}`;
                const replyMarkup = {
                    inline_keyboard: [
                        [
                            { text: `${emojiIcon.point} ${result.data.pointUsage}`, callback_data: "usedPointsForMessage" },
                            { text: `${emojiIcon.model} ${result.data.modelName}`, callback_data: "modelProcessedThisMessage" },
                        ],
                    ]
                };

                try { // download/upload manually to set performer/title
                    const songRes = await fetch(result.data.url);
                    const songBlob = await songRes.blob();

                    const form = new FormData();

                    form.append("chat_id", chatId.toString());
                    form.append('audio', songBlob);
                    form.append('performer', performer);
                    form.append('title', title);
                    form.append('reply_markup', JSON.stringify(replyMarkup));

                    await tgCall(
                        TelegramMethods.SendAudio,
                        form
                    );
                } catch (err) {
                    errorLogger("Music generate upload failed", err);
                    await tgCall(
                        TelegramMethods.SendAudio,
                        {
                            chat_id: chatId,
                            audio: result.data.url,
                            performer: performer,
                            title: title,
                            reply_markup: replyMarkup,
                        }
                    );
                }
            } break;
        }
    });
};
