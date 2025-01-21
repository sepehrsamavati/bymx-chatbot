import type { StoredEntity } from "../contracts/entities";

export type TelegramJoinRequiredChat = {
    id: string;
    title: string;
    link: string;
    chatId: number;
    isActive: boolean;
}

export type TelegramJoinRequiredChatDBModel = StoredEntity<TelegramJoinRequiredChat>;

export type CreateTelegramJoinRequiredChat = Omit<TelegramJoinRequiredChatDBModel, 'id'>;
export type SearchTelegramJoinRequiredChat = Pick<Partial<TelegramJoinRequiredChatDBModel>, 'id' | 'isDeleted' | 'chatId' | 'isActive'>;
export type UpdateTelegramJoinRequiredChat = { id: string } & Pick<Partial<TelegramJoinRequiredChatDBModel>, 'isDeleted' | 'isActive'>;
