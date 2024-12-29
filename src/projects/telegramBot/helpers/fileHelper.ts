import type { TelegramMessage } from "../../../types/telegram.js";
import { getFileSupportInfo } from "../../core/helpers/fileHelper.js";

export const getDocumentInfo = (document: NonNullable<TelegramMessage['document']>) => getFileSupportInfo({
    fileName: document.file_name, mimeType: document.mime_type
});