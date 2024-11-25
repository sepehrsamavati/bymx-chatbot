import type { User } from "./user";
import type { FlattenToIDs, StoredEntity } from "../contracts/entities";

export type TelegramBroadcast = {
    id: string;
    admin: User;
    messageId: number;
    okCount: number;
    startDate: Date | null;
    /** if not null -> not finished */
    endDate: Date | null;
    isForward: boolean;
    pendingTgIds: User['tgId'][];
}

export type TelegramBroadcastDBModel = StoredEntity<TelegramBroadcast>;
export type CreateTelegramBroadcast = Omit<FlattenToIDs<TelegramBroadcastDBModel, 'admin'>, 'id'>;
export type SearchTelegramBroadcast = Pick<Partial<TelegramBroadcastDBModel>, 'isDeleted'> & {
    notNull?: {
        endDate?: true;
    }
};
export type UpdateTelegramBroadcast = { id: string } & Pick<Partial<TelegramBroadcastDBModel>, 'startDate' | 'endDate'>;
