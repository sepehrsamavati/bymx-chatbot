import type { Beautifier } from "../beautifier";

export type StoredEntity<ObjectModel> = Beautifier<
    {
        insertDate: Date;
        isDeleted: boolean;
    }
    & Beautifier<ObjectModel>
>;

export type FlattenToIDs<T, Keys extends keyof T> = {
    [K in keyof T]: K extends Keys ? T[K] extends object ? string : T[K] : T[K];
};
