import mongoose, { type Types, type ObjectId, type Model } from "mongoose";
import type { Beautifier } from "../../../../types/beautifier";
import type { StoredEntity } from "../../../../types/contracts/entities";

export type MongoStored<T> = Omit<T, 'id'>;
export type MongoStoredWithId<T> = Omit<T, 'id'> & { _id: Types.ObjectId; };

export type FlattenToObjectIDs<T, Keys extends keyof T> = {
    [K in keyof T]: K extends Keys ? T[K] extends object ? ObjectId : T[K] : T[K];
};

export type MongooseModelDefinition<CName extends string, MName extends string, DbModel> = Readonly<{
    readonly collection: CName;
    readonly model: MName;
    readonly createModel: (mongooseInstance: mongoose.Connection) => Model<DbModel>;
}>;

export type DatabaseSearchModel<ObjectModel> = StoredEntity<ObjectModel> & {
    _id: string;
};

export type PopulatedProperty<T> = T & { _id: ObjectId; };

export type DatabaseResponseSchema<ObjectModel> = ObjectModel & { _id: ObjectId };

export type GridViewModel<ObjectModel> = Beautifier<
    {
        id: string;
        insertDate: Date;
    }
    & Beautifier<ObjectModel>
>;
