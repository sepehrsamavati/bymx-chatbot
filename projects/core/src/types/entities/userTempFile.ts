import type { User } from "./user";
import type { FlattenToIDs, StoredEntity } from "../contracts/entities";

export type UserTempFile = {
    /** File System ID (fsId) */
    fsId: string;
    filename: string;
    lastAccessed: Date;
    size: number;
    user: User;
    openAiFileId?: string;
    tgId?: string;
    tgUniqueId?: string;
    vectorIds: string[];
    extension: string;
}

export type UserTempFileDBModel = StoredEntity<UserTempFile>;

export type CreateUserTempFile = FlattenToIDs<UserTempFileDBModel, 'user'>;
export type SearchUserTempFile = Partial<Pick<CreateUserTempFile, 'user' | 'fsId' | 'tgId' | 'tgUniqueId' | 'isDeleted'>>;
export type UpdateUserTempFile = {
    /** File System ID (fsId) */
    id: UserTempFile['fsId'];
} & Pick<Partial<UserTempFileDBModel>, 'isDeleted' | 'vectorIds' | 'openAiFileId' | 'lastAccessed'>;
