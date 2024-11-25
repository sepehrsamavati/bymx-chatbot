import type { TelegramMessage } from "../../../types/telegram.js";
import { openAiSupportedFileExtensions } from "../../core/helpers/fileHelper.js";

type DocumentInfo = {
    fileExtension: string;
    isSupported: boolean;
    isPlainText: boolean;
    isFileSearch: boolean;
    fileName: string;
}

export const getDocumentInfo = (document: NonNullable<TelegramMessage['document']>): DocumentInfo => {
    const mimeType = document.mime_type ?? "";
    const fileName = document.file_name ?? "";

    let tempExtension = openAiSupportedFileExtensions.mimeTypeFileExtensionMap[mimeType] ?? "";
    if (!tempExtension) // read extension from file name
        tempExtension = document.file_name?.split('.').pop() as string;

    const isFileSearch = openAiSupportedFileExtensions.fileSearch.includes(tempExtension);
    const isPlainText = openAiSupportedFileExtensions.plainTexts.includes(tempExtension);

    const isSupported = isFileSearch || isPlainText;

    return {
        fileExtension: tempExtension,
        isSupported,
        isPlainText,
        isFileSearch,
        fileName,
    };
};