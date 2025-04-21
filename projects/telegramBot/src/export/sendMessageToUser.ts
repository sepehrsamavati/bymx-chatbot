import tgCall from "../helpers/call.js";
import type { UserEntity } from "bymx-core/types";
import { TelegramMethods } from "../types/enums/telegramMethods.js";

export default async function sendMessageToUser(user: UserEntity.User, text: string) {
    return await tgCall(
        TelegramMethods.SendMessage,
        {
            chat_id: user.tgId,
            text: text,
        }
    );
}