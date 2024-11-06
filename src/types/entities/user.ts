import type { OpenAIModel } from "./openAIModel";
import type { UserType } from "../enums/userTypes";
import type { UserStatus } from "../enums/userStatus";
import type { StoredEntity } from "../contracts/entities";
import type { LangCode } from "../../projects/core/i18n/UIText";

export type User = {
    id: string;
    tgId: number;
    /** Number of times user entity got retrieved from DB */
    usage: number;
    lastActivity: number;
    status: UserStatus;
    lang: LangCode;
    type: UserType;
    mode: number;
    firstName: string;
    /** Selected Open AI model ID */
    selectedOaiModel?: OpenAIModel['id'];
    lastName?: string;
    username?: string;
}

export type UserDBModel = StoredEntity<User>;

export type CreateUserModel = Omit<UserDBModel, 'id'>;
export type UpdateUserModel = Partial<Pick<UserDBModel, 'username' | 'lang' | 'firstName' | 'lastName' | 'isDeleted' | 'mode' | 'status' | 'type' | 'selectedOaiModel'>>;
export type UpsertUserModel = Pick<UserDBModel, 'tgId' | 'username' | 'lang' | 'firstName' | 'lastName'>;
