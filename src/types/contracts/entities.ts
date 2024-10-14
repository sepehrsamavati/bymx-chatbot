import type { Beautifier } from "../beautifier";

export type StoredEntity<ObjectModel> = Beautifier<
    {
        insertDate: Date;
        isDeleted: boolean;
    }
    & Beautifier<ObjectModel>
>;
