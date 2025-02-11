import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { config } from "bymx-core/server";
import { finished } from "node:stream/promises";
import { setTimeout } from 'node:timers/promises';
import { OperationResultWithData } from "bymx-core/shared";
import type { TelegramResponse } from "../types/telegram.js";
import type { TelegramMethods } from "../types/enums/telegramMethods.js";

const botUrl = "https://api.telegram.org/bot" + config.telegram.apiToken + "/";
const botUrlFileStorage = "https://api.telegram.org/file/bot" + config.telegram.apiToken + "/";

export const getFileUrl = (tgFilePath: string) => botUrlFileStorage + tgFilePath;

export const downloadFile = async (tgFilePath: string, extension?: string) => {
    const result = new OperationResultWithData<string>();

    const response = await fetch(getFileUrl(tgFilePath));

    if (!(response.body && response.status === 200))
        return result.failed();

    const fileId = randomUUID();

    let storedFilePath = path.join(config.cacheDirectory, fileId);
    if (extension)
        storedFilePath = storedFilePath + `.${extension}`;

    const body = Readable.from(response.body);
    const downloadWriteStream = fs.createWriteStream(storedFilePath);

    await finished(body.pipe(downloadWriteStream));

    return result.succeeded().setData(fileId);
};

async function _tgCall<Method extends TelegramMethods>(method: Method, params: any): Promise<TelegramResponse<Method> | null> {
    const isFormData = params instanceof FormData;
    return new Promise((resolve) => {
        fetch(botUrl + method, {
            method: 'POST',
            body: isFormData ? params as FormData : JSON.stringify(params),
            headers: isFormData ? undefined : {
                "Content-Type": "application/json"
            }
        })
            .then(async (res) => {
                const data = await res.json();
                if (data && typeof data["ok"] === "boolean") {
                    if (config.isDevelopment && !data.ok)
                        console.error(data);
                    resolve(data);
                }
                else
                    resolve(null);
            })
            .catch(error => {
                resolve(null);
                console.error(error);
            });
    });
}

export default async function tgCall<Method extends TelegramMethods>(method: Method, params: any): Promise<TelegramResponse<Method> | null> {

    for (let tries = 1; tries <= 3; tries++) {
        const result = await _tgCall(method, params);
        if (!result) {
            await setTimeout(1e3);
            continue;
        } else if (result.ok)
            return result;
        else {

            if (tries === 1) {
                const hasMarkdown = params && typeof params === "object" && Object.hasOwn(params, 'parse_mode');
                if (hasMarkdown && (result as any).description?.includes("can't parse entities")) {
                    delete params.parse_mode;
                    continue;
                }
            }

            if (result.error_code === 400 || result.error_code === 403)
                return result;
            else {
                await setTimeout(5e3);
                continue;
            }
        }
    }

    return null;
}