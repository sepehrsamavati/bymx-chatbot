import type { StoredEntity } from "../contracts/entities";

export type TelegramJoinRequiredChat = {
    title: string;
    link: string;
    chatId: number;
}

export type TelegramJoinRequiredChatDBModel = StoredEntity<TelegramJoinRequiredChat>;
export type SearchTelegramJoinRequiredChat = Pick<Partial<TelegramJoinRequiredChatDBModel>, 'isDeleted' | 'chatId'>;
export type UpdateTelegramJoinRequiredChat = { id: string } & Pick<Partial<TelegramJoinRequiredChatDBModel>, 'isDeleted'>;
