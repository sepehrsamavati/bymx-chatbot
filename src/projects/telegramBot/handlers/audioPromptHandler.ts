import emojiIcon from "../helpers/emojiIcon.js";
import tgCall, { downloadFile } from "../helpers/call.js";
import { getChatListPanel } from "../helpers/messages.js";
import { UserMode } from "../../../types/enums/userMode.js";
import stringHelper from "../../core/helpers/stringHelper.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import type { UserTempFile } from "../../../types/entities/userTempFile.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";
import { convertToTelegramMarkdown } from "../helpers/telegramMarkdown.js";

export const audioPromptHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.Voice,
    mode: UserMode.General.Normal,
    async handler(context, update) {
        if (!update.message?.voice)
            return null;

        if (update.message?.reply_to_message?.document) {
            return {
                shouldContinue: false,
                call: {
                    text: "fileNotSupported"
                }
            };
        }

        await tgCall(
            TelegramMethods.SendChatAction,
            {
                chat_id: update.message?.chat.id,
                action: "record_voice"
            }
        );

        if (context.services.fileProcessingLockCache.isLocked(context.user.id))
            return {
                call: {
                    text: "stillProcessingPreviousFile"
                }
            };

        context.services.fileProcessingLockCache.lock(context.user.id);
        const unlockFileProcessing = () => context.services.fileProcessingLockCache.unlock(context.user.id);

        const cachedFile = await context.services.userTempFileApplication.getByTgUniqueId(update.message.voice.file_unique_id);

        let tempFile: UserTempFile | null = null;

        if (cachedFile.ok && cachedFile.data)
            tempFile = {
                ...cachedFile.data,
                user: context.user
            };

        if (!tempFile) {
            const fileInfo = await tgCall(TelegramMethods.GetFile, { file_id: update.message.voice.file_id });

            if (fileInfo?.ok && fileInfo.result.file_path && fileInfo.result.file_path && fileInfo.result.file_size) {
                const maxValidFileSizeMB = 5; // 5MB
                const maxValidFileSizeBytes = maxValidFileSizeMB * Math.pow(1024, 2);
                if (fileInfo.result.file_size > maxValidFileSizeBytes) {
                    unlockFileProcessing();
                    return {
                        call: {
                            text: stringHelper.digitLocalization(
                                stringHelper.formatter(context.uiText.fileSizeExceededError, maxValidFileSizeMB),
                                context.user.lang
                            )
                        }
                    };
                }

                const fileExtension = fileInfo.result.file_path.split('.').pop() as string;
                // if (fileExtension !== tempExtension) {
                //     unlockFileProcessing();
                //     return {
                //         call: {
                //             text: "fileNotSupported"
                //         }
                //     };
                // }

                const downloadResult = await downloadFile(fileInfo.result.file_path, fileExtension);
                if (downloadResult.ok) {
                    tempFile = {
                        extension: fileExtension,
                        fsId: downloadResult.data,
                        size: fileInfo.result.file_size,
                        tgId: fileInfo.result.file_id,
                        tgUniqueId: fileInfo.result.file_unique_id,
                        vectorIds: [],
                        user: context.user,
                        lastAccessed: new Date()
                    };
                }
                else {
                    unlockFileProcessing();
                    return null;
                }
            }
            else {
                unlockFileProcessing();
                return null;
            }
        }

        if (!cachedFile.data) { // if file is not stored in db -> add to db
            const fileAddResult = await context.services.userTempFileApplication.addTempFile(tempFile);

            if (!fileAddResult.ok) {
                unlockFileProcessing();
                return null;
            }
        }

        const res = await context.services.openAIApplication.audioMessage(context.user, tempFile);
        unlockFileProcessing();

        if (res.ok) {
            if (res.data.output) {
                const form = new FormData();

                form.append("chat_id", update.message?.chat.id.toString());
                form.append("reply_to_message_id", update.message?.message_id.toString());
                form.append("reply_markup", JSON.stringify({
                    inline_keyboard: [
                        [{ text: `${emojiIcon.point} ${res.data.pointUsage}`, callback_data: "usedPointsForMessage" }, { text: `${emojiIcon.model} ${context.user.selectedChat?.model.title ?? '-'}`, callback_data: "modelProcessedThisMessage" }]
                    ]
                }));
                // form.append('duration', "6");
                form.append('voice', new Blob([res.data.output]));

                await tgCall(
                    TelegramMethods.SendVoice,
                    form
                );
            } else {
                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        reply_to_message_id: update.message?.message_id,
                        text: res.data.plainText,
                        // text: convertToTelegramMarkdown(res.data.plainText),
                        // parse_mode: res.data.isComplete ? "Markdown" : undefined,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `${emojiIcon.point} ${res.data.pointUsage}`, callback_data: "usedPointsForMessage" }, { text: `${emojiIcon.model} ${context.user.selectedChat?.model.title ?? '-'}`, callback_data: "modelProcessedThisMessage" }]
                            ]
                        }
                    }
                );
            }
        }
        else
            switch (res.message) {
                case "selectChatBeforeUse": {
                    const _chatList = await getChatListPanel(context);

                    if (!_chatList)
                        return null;

                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.message?.chat.id,
                            ..._chatList,
                            text: context.uiText.selectChatBeforeUse
                        }
                    );
                }
                    break;
                case "noActiveSubscription":
                case "planPointsFinished":
                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.message?.chat.id,
                            reply_to_message_id: update.message?.message_id,
                            text: context.getUit(res.message) + `\n\n${context.uiText.buyPlans}: /plans`
                        }
                    );
                    break;
                default:
                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.message?.chat.id,
                            reply_to_message_id: update.message?.message_id,
                            text: context.getUit(res.message)
                        }
                    );
            }

        return { shouldContinue: false };
    }
}
