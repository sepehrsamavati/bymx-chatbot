import { TelegramApiClient } from "bymx-core/server";
import type { TelegramApiContract } from "bymx-core/types";

let tgClient: TelegramApiClient = null!;

/** This module is deprecated, this function is a temporary solution to prevent touching other files of the project (handlers and +160 references) */
export const _injectTelegramClient = (_tgClient: TelegramApiClient) => tgClient = _tgClient;

/** @deprecated */
export const downloadFile: TelegramApiClient['downloadFile'] = (tgFilePath: string, extension?: string) => {
    return tgClient.downloadFile(tgFilePath, extension);
};

/** @deprecated */
export default async function tgCall(method: Parameters<TelegramApiClient['call']>['0'], params: Parameters<TelegramApiClient['call']>['1']) {
    return tgClient.call(method, params);
}