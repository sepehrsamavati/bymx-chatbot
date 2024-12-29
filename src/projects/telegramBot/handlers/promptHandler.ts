import config from "../../core/config.js";
import emojiIcon from "../helpers/emojiIcon.js";
import { getChatListPanel } from "../helpers/messages.js";
import { UserMode } from "../../../types/enums/userMode.js";
import stringHelper from "../../core/helpers/stringHelper.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import tgCall, { downloadFile, getFileUrl } from "../helpers/call.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { convertToTelegramMarkdown } from "../helpers/telegramMarkdown.js";
import type { UserTempFile } from "../../../types/entities/userTempFile.js";
import { openAiSupportedFileExtensions } from "../../core/helpers/fileHelper.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";
import type { IOpenAITextResult, IOpenAITextResultWithFile } from "../../../types/contracts/services.js";
import { getDocumentInfo } from "../helpers/fileHelper.js";

export const promptHandler: IUpdateHandler = {
    name: import.meta.filename,
    updateType: TelegramUpdateType.TextMessage,
    mode: UserMode.General.Normal,
    async handler(context, update) {
        const text = update.message?.text as string;

        if (update.message?.reply_to_message?.document) {

            if (context.user.selectedChat && !context.user.selectedChat.model.assistants.fileSearch)
                return {
                    call: {
                        text: stringHelper.formatter(context.uiText.selectedModelNoFileSearch, context.user.selectedChat.model.title)
                    }
                };

            if (context.services.fileProcessingLockCache.isLocked(context.user.id))
                return {
                    call: {
                        text: "stillProcessingPreviousFile"
                    }
                };

            context.services.fileProcessingLockCache.lock(context.user.id);
            const unlockFileProcessing = () => context.services.fileProcessingLockCache.unlock(context.user.id);

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

            const { fileExtension: tempExtension, isFileSearch, isSupported } = getDocumentInfo(update.message.reply_to_message.document);

            if (!isSupported) {
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

            const cachedFile = await context.services.userTempFileApplication.getByTgUniqueId(update.message.reply_to_message.document.file_unique_id);

            let tempFile: UserTempFile | null = null;

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
                const fileInfo = await tgCall(TelegramMethods.GetFile, { file_id: update.message.reply_to_message.document.file_id });

                if (fileInfo?.ok && fileInfo.result.file_path && fileInfo.result.file_path && fileInfo.result.file_size) {

                    const maxValidFileSizeMB = isFileSearch ? 10 : 1; // 10MB for file search | 1MB for plain text
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

            const res = await context.services.aiApplication.multiModalChatCompletion(
                context.user,
                {
                    text: text
                },
                {
                    file: tempFile
                },
            );

            if (pleaseWaitMessage?.ok && pleaseWaitMessage?.result)
                await tgCall(
                    TelegramMethods.DeleteMessage,
                    {
                        chat_id: update.message?.chat.id,
                        message_id: pleaseWaitMessage.result.message_id
                    }
                );

            unlockFileProcessing();

            const result = res.ok && res.data ? res.data : null;

            if (result) {
                if (result.audio) {
                    const form = new FormData();

                    form.append("chat_id", update.message?.chat.id.toString());
                    form.append("reply_to_message_id", update.message?.message_id.toString());
                    form.append("reply_markup", JSON.stringify({
                        inline_keyboard: [
                            [{ text: `${emojiIcon.point} ${res.data.pointUsage}`, callback_data: "usedPointsForMessage" }, { text: `${emojiIcon.model} ${context.user.selectedChat?.model.title ?? '-'}`, callback_data: "modelProcessedThisMessage" }]
                        ]
                    }));
                    // form.append('duration', "6");
                    form.append('voice', new Blob([result.audio]));

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
                                    [{ text: `${emojiIcon.point} ${res.data.pointUsage}`, callback_data: "usedPointsForMessage" }, { text: `${emojiIcon.model} ${context.user.selectedChat?.model.title ?? '-'}`, callback_data: "modelProcessedThisMessage" }]
                                ]
                            }
                        }
                    );
                }
            }
            else
                return {
                    call: {
                        text: res.message
                    }
                };

            return { shouldContinue: false };
        }

        await tgCall(
            TelegramMethods.SendChatAction,
            {
                chat_id: update.message?.chat.id,
                action: "typing"
            }
        );

        let imageUrl: string | undefined;

        if (update.message?.reply_to_message?.photo) {
            if (context.services.fileProcessingLockCache.isLocked(context.user.id))
                return {
                    call: {
                        text: "stillProcessingPreviousFile"
                    }
                };

            context.services.fileProcessingLockCache.lock(context.user.id);

            const photo = update.message?.reply_to_message?.photo.at(-1);
            if (photo) {
                const fileInfo = await tgCall(TelegramMethods.GetFile, { file_id: photo.file_id });
                if (fileInfo?.ok && fileInfo.result.file_path) {
                    imageUrl = getFileUrl(fileInfo.result.file_path);
                }
            }

            context.services.fileProcessingLockCache.unlock(context.user.id);
        }

        const res = await context.services.aiApplication.multiModalChatCompletion(
            context.user,
            {
                text: text,
            },
            {
                imageUrl
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
                        [{ text: `${emojiIcon.point} ${res.data.pointUsage}`, callback_data: "usedPointsForMessage" }, { text: `${emojiIcon.model} ${context.user.selectedChat?.model.title ?? '-'}`, callback_data: "modelProcessedThisMessage" }]
                    ]
                }));
                // form.append('duration', "6");
                form.append('voice', new Blob([result.audio]));

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
