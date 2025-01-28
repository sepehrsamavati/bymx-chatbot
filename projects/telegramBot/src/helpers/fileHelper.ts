import { fileHelper } from "bymx-core/server";
import type { TelegramMessage } from "../types/telegram.js";

export const getDocumentInfo = (document: NonNullable<TelegramMessage['document']>) => fileHelper.getFileSupportInfo({
    fileName: document.file_name, mimeType: document.mime_type
});