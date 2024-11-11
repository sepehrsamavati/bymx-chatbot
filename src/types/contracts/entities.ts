import type { Beautifier } from "../beautifier";

export type StoredEntity<ObjectModel> = Beautifier<
    {
        insertDate: Date;
        isDeleted: boolean;
    }
    & Beautifier<ObjectModel>
>;

export type FlattenToIDs<T, Keys extends keyof T> = {
    [K in keyof T]: K extends Keys ? NonNullable<T[K]> extends object ? string : NonNullable<T[K]> : NonNullable<T[K]>;
};

export type CaptionOnly = {
    id: string;
    caption: string;
}
