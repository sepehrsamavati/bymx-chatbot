import fs from "node:fs";
import config from "../../config.js";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { setTimeout } from "node:timers/promises";
import type { User } from "../../types/entities/user.js";
import { TelegramResponse } from "../../types/contracts/telegram.js";
import { OperationResultWithData } from "../../common/dto/OperationResult.js";
import { TelegramMethods } from "../../types/enums/telegram/telegramMethods.js";
import { fileStorageHelper, generateFileSystemId } from "../../helpers/storageHelper";

async function _tgCall<Method extends TelegramMethods>(botUrl: string, method: Method, params: any): Promise<TelegramResponse<Method> | null> {
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

export class TelegramApiClient {
    #botUrl = "https://api.telegram.org/bot" + config.telegram.apiToken + "/";
    #botUrlFileStorage = "https://api.telegram.org/file/bot" + config.telegram.apiToken + "/";

    getFileUrl(tgFilePath: string) {
        return this.#botUrlFileStorage + tgFilePath;
    };

    async sendMessageToUser(user: User, text: string) {

        if (!user.telegram)
            return null;

        return await this.call(
            TelegramMethods.SendMessage,
            {
                chat_id: user.telegram.id,
                text: text,
            }
        );
    }

    async downloadFile(tgFilePath: string, extension?: string) {
        const result = new OperationResultWithData<string>();

        const response = await fetch(this.getFileUrl(tgFilePath));

        if (!(response.body && response.status === 200))
            return result.failed();

        const fileId = generateFileSystemId();

        const storedFilePath = fileStorageHelper.userTemporary.getFilePath(fileId);

        const body = Readable.from(response.body);
        const downloadWriteStream = fs.createWriteStream(storedFilePath);

        await finished(body.pipe(downloadWriteStream));

        return result.succeeded().setData(fileId);
    }

    async call<Method extends TelegramMethods>(method: Method, params: any): Promise<TelegramResponse<Method> | null> {

        for (let tries = 1; tries <= 3; tries++) {
            const result = await _tgCall(this.#botUrl, method, params);
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
}
