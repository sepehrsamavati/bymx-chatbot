import fs from "node:fs";
import { errorLogger } from "../logger.js";
import { createRequire } from "node:module";
import { tryGetFileExtension } from "../fileHelper.js";
import { fileStorageHelper } from "../storageHelper.js";
import type { UserTempFile } from "../../types/entities/userTempFile.js";

const require = createRequire(import.meta.url);

async function pdfParser(fileBuffer: Buffer) {
    const _fnc = require('pdf-parse');
    return _fnc(fileBuffer);
}

export async function getFileContent(path: string): Promise<string | null>;
export async function getFileContent(tempFile: Pick<UserTempFile, 'fsId' | 'extension'>): Promise<string | null>;
export async function getFileContent(pathOrTempFile: string | Pick<UserTempFile, 'fsId' | 'extension'>) {

    const filePath = typeof pathOrTempFile === "string" ? pathOrTempFile : fileStorageHelper.userTemporary.getFilePath(pathOrTempFile.fsId);

    if (!fs.existsSync(filePath))
        return null;

    const extension = typeof pathOrTempFile === "string" ? tryGetFileExtension(pathOrTempFile) : pathOrTempFile.extension;
    let fileData: Buffer;

    try {
        fileData = await fs.promises.readFile(filePath);
    } catch (err) {
        errorLogger(`Read file ${filePath}`, err);
        return null;
    }

    let content = "";

    if (extension === "pdf") {
        try {
            const pdfInfo = await pdfParser(fileData);
            content = pdfInfo.text.trim();
        } catch (err) {
            errorLogger(`Parse PDF ${filePath}`, err);
            return null;
        }
    } else {
        content = fileData.toString();
    }

    return content;
}
