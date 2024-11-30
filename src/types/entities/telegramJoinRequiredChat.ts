import type { StoredEntity } from "../contracts/entities";

export type TelegramJoinRequiredChat = {
    title: string;
    link: string;
    chatId: number;
    isActive: boolean;
}

export type TelegramJoinRequiredChatDBModel = StoredEntity<TelegramJoinRequiredChat>;
export type SearchTelegramJoinRequiredChat = Pick<Partial<TelegramJoinRequiredChatDBModel>, 'isDeleted' | 'chatId' | 'isActive'>;
export type UpdateTelegramJoinRequiredChat = { id: string } & Pick<Partial<TelegramJoinRequiredChatDBModel>, 'isDeleted' | 'isActive'>;
