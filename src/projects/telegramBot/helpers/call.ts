import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import config from "../../core/config.js";
import { finished } from "node:stream/promises";
import type { TelegramResponse } from "../../../types/telegram.js";
import type { TelegramMethods } from "../../../types/enums/telegramMethods.js";
import { OperationResultWithData } from "../../core/common/dto/OperationResult.js";

const botUrl = "https://api.telegram.org/bot" + config.telegramBotToken + "/";
const botUrlFileStorage = "https://api.telegram.org/file/bot" + config.telegramBotToken + "/";

export const downloadFile = async (filePath: string) => {
    const result = new OperationResultWithData<string>();

    const response = await fetch(botUrlFileStorage + filePath);

    if (!(response.body && response.status === 200))
        return result.failed();

    const fileId = randomUUID();
    const body = Readable.from(response.body);
    const downloadWriteStream = fs.createWriteStream(path.join(config.cacheDirectory, fileId));

    await finished(body.pipe(downloadWriteStream));

    return result.succeeded().setData(fileId);
};

export default async function tgCall<Method extends TelegramMethods>(method: Method, params: any): Promise<TelegramResponse<Method> | null> {
    // let formData = params instanceof FormData ? params : null;

    // if (formData && params && params.file) {
    //     // formData = new FormData();
    //     // formData.append(method.slice(4).toLocaleLowerCase(), fs.createReadStream(params.file as string));
    //     // delete params.file;

    //     for (const param of Object.entries(params)) {
    //         formData.append(param[0], typeof param[1] === "object" ? JSON.stringify(param[1]) : (typeof param[1] === "boolean" ? param[1].toString() : param[1] as string));
    //     }
    // }

    return new Promise((resolve) => {
        fetch(botUrl + method, {
            method: 'POST',
            body: JSON.stringify(params),
            headers: {
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