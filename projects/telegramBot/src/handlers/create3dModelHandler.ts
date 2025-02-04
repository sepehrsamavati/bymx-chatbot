import { fileHelper } from "bymx-core/server";
import emojiIcon from "../helpers/emojiIcon.js";
import tgCall, { downloadFile } from "../helpers/call.js";
import { stringHelper, UserMode } from "bymx-core/shared";
import type { UserTempFileEntity } from "bymx-core/types";
import type { IUpdateHandler } from "../types/telegram.js";
import { getDocumentInfo } from "../helpers/fileHelper.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";
import { TelegramUpdateType } from "../types/enums/telegramUpdateHandler.js";
import { cache as stepBridgeCache } from "../modules/generationTaskEventListener.js";

export const create3dModelHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: [
        TelegramUpdateType.Photo,
        TelegramUpdateType.Document,
    ],
    mode: UserMode.UserPrompt.Create3dModel,
    async handler(context, update) {
        const photo = update.message?.photo?.at(-1);
        const document = update.message?.document;

        if (context.services.fileProcessingLockCache.isLocked(context.user.id))
            return {
                call: {
                    text: "stillProcessingPreviousFile"
                }
            };

        const unlockFileProcessing = () => context.services.fileProcessingLockCache.unlock(context.user.id);
        const maxValidFileSizeMB = 5;

        context.services.fileProcessingLockCache.lock(context.user.id);

        let imageFile: UserTempFileEntity.UserTempFile | null = null;

        if (photo) {
            const cachedFile = await context.services.userTempFileApplication.getByTgUniqueId(photo.file_unique_id);

            if (cachedFile.ok && cachedFile.data)
                imageFile = {
                    ...cachedFile.data,
                    user: context.user
                };

            if (!imageFile) {
                const fileInfo = await tgCall(TelegramMethods.GetFile, { file_id: photo.file_id });

                if (fileInfo?.ok && fileInfo.result.file_path && fileInfo.result.file_path && fileInfo.result.file_size) {
                    const fileExtension = "jpg";
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
                        imageFile = {
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
                const fileAddResult = await context.services.userTempFileApplication.addTempFile(imageFile);

                if (!fileAddResult.ok) {
                    unlockFileProcessing();
                    return null;
                }
            }

        }
        else if (document) {
            const { fileExtension: tempExtension } = getDocumentInfo(document);

            const isSupported = fileHelper.falAiSupportedFileExtensions.isSupportedImage(tempExtension);

            if (!isSupported) {
                unlockFileProcessing();
                return {
                    call: {
                        text: "targetFileNotSupported"
                    }
                };
            }

            const cachedFile = await context.services.userTempFileApplication.getByTgUniqueId(document.file_unique_id);

            let tempFile: UserTempFileEntity.UserTempFile | null = null;

            if (cachedFile.ok && cachedFile.data)
                tempFile = {
                    ...cachedFile.data,
                    user: context.user
                };

            if (!tempFile) {
                const fileInfo = await tgCall(TelegramMethods.GetFile, { file_id: document.file_id });

                if (fileInfo?.ok && fileInfo.result.file_path && fileInfo.result.file_path && fileInfo.result.file_size) {

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
        }

        if (!imageFile) {
            unlockFileProcessing();
            return null;
        }

        const generate3dModelResult = await context.services.aiApplication.trellis3dModelGenerate(context.user, imageFile);

        unlockFileProcessing();

        if (generate3dModelResult.data)
            stepBridgeCache.set(generate3dModelResult.data, {
                internalTaskId: generate3dModelResult.data,
                update: update,
            });

        return {
            call: {
                text: `${generate3dModelResult.ok ? emojiIcon.ok : emojiIcon.failed} ${context.getUit(generate3dModelResult.message)}`
            }
        };
    }
}
