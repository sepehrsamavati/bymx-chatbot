import emojiIcon from "../helpers/emojiIcon.js";
import { getChatListPanel } from "../helpers/messages.js";
import { UserMode } from "../../../types/enums/userMode.js";
import { UserType } from "../../../types/enums/userTypes.js";
import type { IUpdateHandler } from "../../../types/telegram.js";
import tgCall, { downloadFile, getFileUrl } from "../helpers/call.js";
import { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { convertToTelegramMarkdown } from "../helpers/telegramMarkdown.js";
import type { UserTempFile } from "../../../types/entities/userTempFile.js";
import { openAiSupportedFileExtensions } from "../../core/helpers/fileHelper.js";
import { TelegramUpdateType } from "../../../types/enums/telegramUpdateHandler.js";

export const promptHandler: IUpdateHandler = {
    updateType: TelegramUpdateType.TextMessage,
    mode: UserMode.General.Normal,
    async handler(context, update) {
        const text = update.message?.text as string;

        if (context.user.type === UserType.Owner && update.message?.reply_to_message?.document) {

            const tempExtension = update.message.reply_to_message.document.mime_type?.split('/').pop() as string;
            if (!openAiSupportedFileExtensions.fileSearch.includes(tempExtension))
                return {
                    call: {
                        text: "targetFileNotSupported"
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

            const cachedFile = await context.services.userTempFileApplication.getByTgUniqueId(update.message.reply_to_message.document.file_unique_id);

            let tempFile: UserTempFile | null = null;

            if (cachedFile.ok && cachedFile.data)
                tempFile = {
                    ...cachedFile.data,
                    user: context.user
                };

            if (!tempFile) {
                const fileInfo = await tgCall(TelegramMethods.GetFile, { file_id: update.message.reply_to_message.document.file_id });

                if (fileInfo?.ok && fileInfo.result.file_path && fileInfo.result.file_path && fileInfo.result.file_size) {

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

            if (!cachedFile.data) {
                const fileAddResult = await context.services.userTempFileApplication.addTempFile(tempFile);

                if (!fileAddResult.ok) {
                    unlockFileProcessing();
                    return null;
                }
            }

            const res = await context.services.openAIApplication.fileWithMessage({
                tempFile, message: text
            });

            unlockFileProcessing();

            if (res.ok)
                await tgCall(
                    TelegramMethods.SendMessage,
                    {
                        chat_id: update.message?.chat.id,
                        reply_to_message_id: update.message?.message_id,
                        text: convertToTelegramMarkdown(res.data.output),
                        parse_mode: res.data.isComplete ? "Markdown" : undefined,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: `${emojiIcon.point} ${res.data.pointUsage}`, callback_data: "usedPointsForMessage" }, { text: `${emojiIcon.model} ${context.user.selectedChat?.model.title ?? '-'}`, callback_data: "modelProcessedThisMessage" }]
                            ]
                        }
                    }
                );
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

        if (context.user.type === UserType.Owner && update.message?.reply_to_message?.photo) {
            const photo = update.message?.reply_to_message?.photo.at(-1);
            if (photo) {
                const fileInfo = await tgCall(TelegramMethods.GetFile, { file_id: photo.file_id });
                if (fileInfo?.ok && fileInfo.result.file_path) {
                    imageUrl = getFileUrl(fileInfo.result.file_path);
                }
            }
        }

        const res = await (imageUrl ? context.services.openAIApplication.imageMessage(context.user, text, imageUrl) : context.services.openAIApplication.textMessage(context.user, text));

        if (res.ok)
            await tgCall(
                TelegramMethods.SendMessage,
                {
                    chat_id: update.message?.chat.id,
                    reply_to_message_id: update.message?.message_id,
                    text: convertToTelegramMarkdown(res.data.output),
                    parse_mode: res.data.isComplete ? "Markdown" : undefined,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: `${emojiIcon.point} ${res.data.pointUsage}`, callback_data: "usedPointsForMessage" }, { text: `${emojiIcon.model} ${context.user.selectedChat?.model.title ?? '-'}`, callback_data: "modelProcessedThisMessage" }]
                        ]
                    }
                }
            );
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
