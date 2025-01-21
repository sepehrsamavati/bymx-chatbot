import tgCall, { downloadFile, getFileUrl } from "../helpers/call.js";
import emojiIcon from "../helpers/emojiIcon.js";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { UserMode } from "../../../core/dist/types/enums/userMode.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";
import { stringHelper } from "bymx-core/shared";
import { UserTempFileEntity } from "bymx-core/types";

export const musicGenerateHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: [
        TelegramUpdateType.Audio,
        TelegramUpdateType.TextMessage,
    ],
    mode: UserMode.UserPrompt.MusicWithLyricsAndTemplateGeneration,
    async handler(context, update) {
        const message = update.message?.text;
        const audio = update.message?.audio;

        if (message && update.message?.reply_to_message?.audio && message.length < 1500) {
            const audio = update.message?.reply_to_message?.audio;
            let pleaseWaitMessageId = 0;
            const unlockFileProcessing = () => {
                context.services.fileProcessingLockCache.unlock(context.user.id);
                if (pleaseWaitMessageId)
                    tgCall(
                        TelegramMethods.DeleteMessage,
                        {
                            chat_id: update.message?.chat.id,
                            message_id: pleaseWaitMessageId,
                        }
                    );
            };

            if (audio.duration > 360) {
                return {
                    call: {
                        text: stringHelper.formatter(context.uiText.musicTooLong, 6)
                    }
                };
            }

            if (context.services.fileProcessingLockCache.isLocked(context.user.id))
                return {
                    call: {
                        text: "stillProcessingPreviousFile"
                    }
                };

            context.services.fileProcessingLockCache.lock(context.user.id);

            const pleaseWaitMessage = await tgCall(
                TelegramMethods.SendMessage,
                {
                    chat_id: update.message?.chat.id,
                    reply_to_message_id: update.message?.message_id,
                    text: context.uiText.creatingMusicPleaseWait
                }
            );

            if (pleaseWaitMessage?.ok && pleaseWaitMessage.result.message_id)
                pleaseWaitMessageId = pleaseWaitMessage.result.message_id;

            const cachedFile = await context.services.userTempFileApplication.getByTgUniqueId(audio.file_unique_id);

            let tempFile: UserTempFileEntity.UserTempFile | null = null;

            if (cachedFile.ok && cachedFile.data)
                tempFile = {
                    ...cachedFile.data,
                    user: context.user
                };

            if (!tempFile) {
                const fileInfo = await tgCall(TelegramMethods.GetFile, { file_id: audio.file_id });

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

                    const downloadResult = await downloadFile(fileInfo.result.file_path, fileExtension);
                    if (downloadResult.ok && downloadResult.data) {
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

            const musicGenerateResult = await context.services.aiApplication.musicGenerateWithLyrics(context.user, {
                audioFile: tempFile,
                lyrics: message,
            });

            unlockFileProcessing();

            if (musicGenerateResult.ok && musicGenerateResult.data) {
                await tgCall(
                    TelegramMethods.SendChatAction,
                    {
                        chat_id: update.message?.chat.id,
                        action: "upload_voice"
                    }
                );

                await tgCall(
                    TelegramMethods.SendAudio,
                    {
                        chat_id: update.message?.chat.id,
                        reply_to_message_id: update.message?.message_id,
                        audio: musicGenerateResult.data.url,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: `${emojiIcon.point} ${musicGenerateResult.data.pointUsage}`, callback_data: "usedPointsForMessage" },
                                    { text: `${emojiIcon.model} ${musicGenerateResult.data.modelName}`, callback_data: "modelProcessedThisMessage" },
                                ],
                                [
                                    { text: `${emojiIcon.failed} ${context.uiText.cancelMusicGeneration}`, callback_data: "panel" },
                                ]
                            ]
                        }
                    }
                );
            } else {
                return {
                    call: {
                        text: musicGenerateResult.message
                    }
                };
            }

        } else if (audio) {

            if (audio.duration > 360) {
                return {
                    call: {
                        text: stringHelper.formatter(context.uiText.musicTooLong, 6)
                    }
                };
            }

            return {
                call: {
                    text: context.uiText.nowReplyLyricsToAudio
                }
            };
        }

        return { shouldContinue: false };
    }
}
