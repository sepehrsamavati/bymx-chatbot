import { config } from "bymx-core/server";
import emojiIcon from "../helpers/emojiIcon.js";
import { UserTempFileEntity } from "bymx-core/types";
import { stringHelper, UserMode } from "bymx-core/shared";
import { getChatListPanel } from "../modules/messages.js";
import tgCall, { downloadFile } from "../helpers/call.js";
import { getDocumentInfo } from "../helpers/fileHelper.js";
import type { IUpdateHandler } from "../types/telegram.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { convertToTelegramMarkdown } from "../helpers/telegramMarkdown.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";

export const promptHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: [
        TelegramUpdateType.TextMessage,
        TelegramUpdateType.Voice,
        TelegramUpdateType.Document,
        TelegramUpdateType.Photo,
    ],
    mode: UserMode.General.Normal,
    async handler(context, update) {
        if (update.message?.forward_origin)
            return { shouldContinue: true };

        const text = update.message?.text ?? update.message?.caption;
        const voice = update.message?.voice;
        const unlockFileProcessing = () => context.services.fileProcessingLockCache.unlock(context.user.id);

        let userVoiceFile: { file: UserTempFileEntity.UserTempFile; duration?: number; } | null = null;

        if (voice) {

            if (voice.duration > 120)
                return {
                    call: {
                        text: stringHelper.formatter(context.uiText.voiceTooLong, 2)
                    }
                };

            if (context.services.fileProcessingLockCache.isLocked(context.user.id))
                return {
                    call: {
                        text: "stillProcessingPreviousFile"
                    }
                };

            context.services.fileProcessingLockCache.lock(context.user.id);

            const cachedFile = await context.services.userTempFileApplication.getByTgUniqueId(voice.file_unique_id);

            let tempFile: UserTempFileEntity.UserTempFile | null = null;

            if (cachedFile.ok && cachedFile.data)
                tempFile = {
                    ...cachedFile.data,
                    user: context.user
                };

            if (!tempFile) {
                const fileInfo = await tgCall(TelegramMethods.GetFile, { file_id: voice.file_id });

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
                            filename: `Voice.${fileExtension}`,
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

            userVoiceFile = {
                file: tempFile,
                duration: voice.duration,
            };
            unlockFileProcessing();
        }

        const multiModalInput = userVoiceFile ? { voice: userVoiceFile } : (text ? { text: text } : null);

        if (!multiModalInput)
            return {
                call: {
                    text: "invalidInput"
                }
            };

        let attachmentFile: UserTempFileEntity.UserTempFile | undefined;
        let pleaseWaitMessageId = 0;

        let attachmentTgDocument = update.message?.reply_to_message?.document;
        if (update.message?.document) // read caption as prompt
            attachmentTgDocument = update.message?.document;

        if (attachmentTgDocument) {

            if (context.services.fileProcessingLockCache.isLocked(context.user.id))
                return {
                    call: {
                        text: "stillProcessingPreviousFile"
                    }
                };

            context.services.fileProcessingLockCache.lock(context.user.id);

            const canDoFileProcessing = await context.services.userApplication.getUserFileProcessingStatus(context.user.id);
            if (!canDoFileProcessing.ok) { // user file processing rate limit reached
                return {
                    call: {
                        text: canDoFileProcessing.message === "fileProcessingLimitReached" ? stringHelper.digitLocalization(
                            stringHelper.formatter(context.uiText.fileProcessingLimitReached, [config.fileProcessingLimit.timePeriod, config.fileProcessingLimit.count]),
                            context.user.lang
                        ) : canDoFileProcessing.message
                    }
                };
            }

            const { fileExtension: tempExtension, isExtractable } = getDocumentInfo(attachmentTgDocument);

            if (!isExtractable) {
                unlockFileProcessing();
                return {
                    call: {
                        text: "targetFileNotSupported"
                    }
                };
            }

            const pleaseWaitMessage = await tgCall(
                TelegramMethods.SendMessage,
                {
                    chat_id: update.message?.chat.id,
                    reply_to_message_id: update.message?.message_id,
                    text: '⏳'
                }
            );

            if (pleaseWaitMessage?.ok && pleaseWaitMessage.result.message_id)
                pleaseWaitMessageId = pleaseWaitMessage.result.message_id;

            const cachedFile = await context.services.userTempFileApplication.getByTgUniqueId(attachmentTgDocument.file_unique_id);

            let tempFile: UserTempFileEntity.UserTempFile | null = null;

            if (cachedFile.ok && cachedFile.data)
                tempFile = {
                    ...cachedFile.data,
                    user: context.user
                };

            if (!tempFile || !tempFile.openAiFileId) { // file is not downloaded from tg OR file is not uploaded to oai
                const canDoFileUpload = await context.services.userTempFileApplication.getUserUsageStatus(context.user.id);
                if (!canDoFileUpload.ok) { // user file upload rate limit reached
                    return {
                        call: {
                            text: canDoFileUpload.message === "fileUploadLimitReached" ? stringHelper.digitLocalization(
                                stringHelper.formatter(context.uiText.fileUploadLimitReached, [config.fileUploadLimit.timePeriod, config.fileUploadLimit.count]),
                                context.user.lang
                            ) : canDoFileUpload.message
                        }
                    };
                }
            }

            if (!tempFile) {
                const fileInfo = await tgCall(TelegramMethods.GetFile, { file_id: attachmentTgDocument.file_id });

                if (fileInfo?.ok && fileInfo.result.file_path && fileInfo.result.file_path && fileInfo.result.file_size) {

                    const maxValidFileSizeMB = tempExtension === "pdf" ? 10 : 1; // 10MB for pdf | 1MB for plain text
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
                    if (fileExtension !== tempExtension) {
                        unlockFileProcessing();
                        return {
                            call: {
                                text: "fileNotSupported"
                            }
                        };
                    }

                    const downloadResult = await downloadFile(fileInfo.result.file_path, fileExtension);
                    if (downloadResult.ok && downloadResult.data) {
                        tempFile = {
                            extension: fileExtension,
                            fsId: downloadResult.data,
                            size: fileInfo.result.file_size,
                            tgId: fileInfo.result.file_id,
                            tgUniqueId: fileInfo.result.file_unique_id,
                            filename: attachmentTgDocument.file_name || `File.${fileExtension}`,
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

            attachmentFile = tempFile;
        }

        if (!pleaseWaitMessageId)
            await tgCall(
                TelegramMethods.SendChatAction,
                {
                    chat_id: update.message?.chat.id,
                    action: context.user.voiceResponse.on ? "record_voice" : "typing"
                }
            );

        let imageFile: UserTempFileEntity.UserTempFile | undefined = undefined;

        let attachmentTgPhoto = update.message?.reply_to_message?.photo;
        if (update.message?.photo)
            attachmentTgPhoto = update.message?.photo;

        if (!attachmentFile && attachmentTgPhoto) {
            if (context.services.fileProcessingLockCache.isLocked(context.user.id))
                return {
                    call: {
                        text: "stillProcessingPreviousFile"
                    }
                };

            context.services.fileProcessingLockCache.lock(context.user.id);

            const photo = attachmentTgPhoto.at(-1);
            if (photo) {
                const cachedFile = await context.services.userTempFileApplication.getByTgUniqueId(photo.file_unique_id);

                let tempFile: UserTempFileEntity.UserTempFile | null = null;

                if (cachedFile.ok && cachedFile.data)
                    tempFile = {
                        ...cachedFile.data,
                        user: context.user
                    };

                if (!tempFile) {
                    const fileInfo = await tgCall(TelegramMethods.GetFile, { file_id: photo.file_id });

                    if (fileInfo?.ok && fileInfo.result.file_path && fileInfo.result.file_path && fileInfo.result.file_size) {
                        const fileExtension = "jpg";
                        const maxValidFileSizeMB = 5; // 5MB for file search | 1MB for plain text
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

                        const downloadResult = await downloadFile(fileInfo.result.file_path, fileExtension);
                        if (downloadResult.ok && downloadResult.data) {
                            tempFile = {
                                extension: fileExtension,
                                fsId: downloadResult.data,
                                size: fileInfo.result.file_size,
                                tgId: fileInfo.result.file_id,
                                tgUniqueId: fileInfo.result.file_unique_id,
                                filename: `Image.${fileExtension}`,
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

                imageFile = tempFile;
            }

            context.services.fileProcessingLockCache.unlock(context.user.id);
        }

        const res = await context.services.aiApplication.multiModalChatCompletion({
            user: context.user,
            createDefaultChat: true,
            inputMessage: multiModalInput,
            attachment: {
                image: imageFile,
                file: attachmentFile
            },
        });

        if (attachmentFile)
            unlockFileProcessing();

        if (pleaseWaitMessageId)
            tgCall(
                TelegramMethods.DeleteMessage,
                {
                    chat_id: update.message?.chat.id,
                    message_id: pleaseWaitMessageId,
                }
            );

        const result = res.ok && res.data ? res.data : null;

        if (result) {
            if (result.audio) {
                const form = new FormData();

                form.append("chat_id", update.message?.chat.id.toString() as string);
                form.append("reply_to_message_id", update.message?.message_id.toString() as string);
                form.append("reply_markup", JSON.stringify({
                    inline_keyboard: [
                        [{ text: `${emojiIcon.point} ${result.pointUsage}`, callback_data: "usedPointsForMessage" }, { text: `${emojiIcon.model} ${context.user.selectedChat?.model.title ?? '-'}`, callback_data: "modelProcessedThisMessage" }]
                    ]
                }));
                form.append('duration', result.audio.duration.toString());
                form.append('voice', new Blob([result.audio.data]));

                if (result.plainText.length < 1024) {
                    form.append("caption", convertToTelegramMarkdown(result.plainText));
                    if (result.isComplete)
                        form.append("parse_mode", "Markdown");
                }

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
                        text: convertToTelegramMarkdown(result.plainText),
                        parse_mode: result.isComplete ? "Markdown" : undefined,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `${emojiIcon.point} ${result.pointUsage}`, callback_data: "usedPointsForMessage" }, { text: `${emojiIcon.model} ${context.user.selectedChat?.model.title ?? '-'}`, callback_data: "modelProcessedThisMessage" }]
                            ]
                        }
                    }
                );
            }
        }
        else
            switch (res.message) {
                case "modelNotAvailable":
                    await tgCall(
                        TelegramMethods.SendMessage,
                        {
                            chat_id: update.message?.chat.id,
                            reply_to_message_id: update.message?.message_id,
                            text: context.getUit(res.message) + `\n\n${context.uiText.changeModel}: /change_model`
                        }
                    );
                    break;
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
