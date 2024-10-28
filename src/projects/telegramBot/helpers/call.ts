import config from "../../core/config.js";
import type { TelegramResponse, TelegramUpdateObject } from "../../../types/telegram.js";
import type { TelegramMethods } from "../../../types/enums/telegramMethods.js";

const botUrl = "https://api.telegram.org/bot" + config.telegramBotToken;

export default async function tgCall<Method extends TelegramMethods>(method: Method, params: any): Promise<TelegramResponse<Method> | null> {
    let formData = params instanceof FormData ? params : null;

    if (formData && params && params.file) {
        // formData = new FormData();
        // formData.append(method.slice(4).toLocaleLowerCase(), fs.createReadStream(params.file as string));
        // delete params.file;

        for (const param of Object.entries(params)) {
            formData.append(param[0], typeof param[1] === "object" ? JSON.stringify(param[1]) : (typeof param[1] === "boolean" ? param[1].toString() : param[1] as string));
        }
    }

    return new Promise((resolve) => {
        fetch(botUrl + method, {
            method: 'POST',
            body: formData || params,
            // headers: formData ? formData.getHeaders() : {}
        })
            .then(async (res) => {
                const data = await res.json();
                if (res.ok && data && data.result) {
                    resolve(data.result);
                } else {
                    resolve(null);
                }
            })
            .catch(error => {
                resolve(null);
                if (error.response && error.response.data) {
                    console.error(error.response.data);
                } else {
                    console.error(error.message ?? error);
                }
            });
    });
}