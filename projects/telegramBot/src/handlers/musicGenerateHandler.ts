import { fileHelper } from "bymx-core/server";
import emojiIcon from "../helpers/emojiIcon.js";
import { UserTempFileEntity } from "bymx-core/types";
import tgCall, { downloadFile } from "../helpers/call.js";
import { stringHelper, UserMode } from "bymx-core/shared";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";
import { cache as stepBridgeCache } from "../modules/generationTaskEventListener.js";

export const musicGenerateHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: [
        TelegramUpdateType.Audio,
        TelegramUpdateType.TextMessage,
    ],
    mode: UserMode.UserPrompt.MusicWithLyricsAndTemplateGeneration,
    async handler(context, update, { tgCall }) {
        const message = update.message?.text;
        const audio = update.message?.audio;

        if (message && update.message?.reply_to_message?.audio) {

            const audio = update.message?.reply_to_message?.audio;
            const unlockFileProcessing = () => {
                context.services.fileProcessingLockCache.unlock(context.user.id);
            };

            if (!fileHelper.falAiSupportedFileExtensions.isSupportedMinimaxMusicGen(audio.mime_type ?? "")) {
                return {
                    call: {
                        text: "invalidInput"
                    }
                };
            }

            if (message.length > 600)
                return {
                    call: {
                        text: "lyricsTooLong"
                    }
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
                    const maxValidFileSizeMB = 10; // 10MB
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

                    const fileExtension = fileHelper.tryGetFileExtension(fileInfo.result.file_path);

                    const downloadResult = await downloadFile(fileInfo.result.file_path, fileExtension);
                    if (downloadResult.ok && downloadResult.data) {
                        tempFile = {
                            extension: fileExtension,
                            fsId: downloadResult.data,
                            size: fileInfo.result.file_size,
                            tgId: fileInfo.result.file_id,
                            tgUniqueId: fileInfo.result.file_unique_id,
                            filename: `Music.${fileExtension}`,
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

            if (musicGenerateResult.data)
                stepBridgeCache.set(musicGenerateResult.data, {
                    internalTaskId: musicGenerateResult.data,
                    update: update,
                });

            return {
                call: {
                    text: `${musicGenerateResult.ok ? emojiIcon.ok : emojiIcon.failed} ${context.getUit(musicGenerateResult.message)}`
                }
            };
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
