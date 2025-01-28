
import path from "node:path";
import config from "../config.js";
import type { UserTempFile } from "../types/entities/userTempFile.js";

export const getTempFilePath = (tempFile: Pick<UserTempFile, 'fsId' | 'extension'>) => path.join(config.cacheDirectory, tempFile.fsId) + `.${tempFile.extension}`;
