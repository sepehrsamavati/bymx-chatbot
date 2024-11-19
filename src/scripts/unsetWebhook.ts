import tgCall from "../projects/telegramBot/helpers/call.js";
import { TelegramMethods } from "../types/enums/telegramMethods.js";

tgCall(TelegramMethods.SetWebhook, {
    url: ""
})
    .then(res => {
        if (res?.ok === true)
            console.log("✅ Webhook unset was successful");
    });
