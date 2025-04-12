
import fs from "node:fs";
import path from "node:path";
import config from "../config.js";
import { logger } from "./logger.js";
import { randomUUID } from "node:crypto";
import { TempFileStatus } from "../types/enums/fileStatus.js";

export const generateFileSystemId = (): string => randomUUID();

const createHelperBase = <T extends string>(directoryName: T) => {
    const directory = path.join(config.storageBasePath, directoryName);
    const getFilePath = (fileName: string) => path.join(directory, fileName);

    if (!fs.existsSync(directory))
        fs.mkdirSync(directory, { recursive: true });

    return Object.freeze({ directory, getFilePath });
};

const tempFileHelper = createHelperBase("temp");

const createHelper = <T extends string>(directoryName: T) => {
    const base = createHelperBase(directoryName);
    const tempFile = (fileName: string) => {
        const tempFilePath = tempFileHelper.getFilePath(fileName);
        const filePath = base.getFilePath(fileName);
        let status = TempFileStatus.None;

        /** Move temp file to destination directory */
        const acceptFile = async () => {
            try {
                await fs.promises.rename(tempFilePath, filePath);
                status = TempFileStatus.Accepted;
                return true;
            } catch (e) {
                logger.error(`Accept temp file error on file '${filePath}', ${(e instanceof Error ? e.message : e)}`);
                return false;
            }
        };

        /** Remove accepted file or temp file depending on the status */
        const rejectFile = async () => {
            try {
                await fs.promises.unlink(status === TempFileStatus.Accepted ? base.getFilePath(fileName) : tempFilePath);
                status = TempFileStatus.Rejected;
                return true;
            } catch (e) {
                logger.error(`Reject temp file error on file '${filePath}', ${(e instanceof Error ? e.message : e)}`);
                return false;
            }
        };

        return Object.freeze({
            acceptFile,
            rejectFile,
            path: tempFilePath,
            get status() {
                return status;
            },
            get accepted() {
                return status === TempFileStatus.Accepted;
            }
        });
    };

    // const removeFile =  async (fileName: string) => {
    //     const currentFilePath = base.getFilePath(fileName);
    //     const newFilePath = recycleBinFileHelper.getFilePath(`${directoryName}_${fileName}`);
    //     try {
    //         await fs.promises.rename(currentFilePath, newFilePath);
    //         return true;
    //     } catch (e) {
    //         logger.error(`Remove file error on file '${currentFilePath}', ${(e instanceof Error ? e.message : e)}`);
    //         return false;
    //     }
    // };

    return Object.freeze({ ...base, tempFile });
};

export const fileStorageHelper = Object.freeze({
    /** Server side temporary files; Not accepted */
    temporary: tempFileHelper,

    /** Temporary stored user files */
    userTemporary: createHelper("user-temp-files"),

    audioConvert: createHelperBase("audio-convert"),
    audioDuration: createHelperBase("audio-duration"),
});

export const tryDelete = async (path: string) => {
    try {
        await fs.promises.unlink(path);
        return true;
    } catch (e) {
        logger.error(`Try delete '${path}' error, ${(e instanceof Error ? e.message : e)}`);
        return false;
    }
};
