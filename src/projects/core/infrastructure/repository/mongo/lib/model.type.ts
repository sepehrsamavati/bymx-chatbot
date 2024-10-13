import mongoose, { type ObjectId, type Model } from "mongoose";

type Beautifier<Obj> = {
    [K in keyof Obj]: Obj[K];
};

export type MongooseModelDefinition<CName extends string, MName extends string, DbModel> = Readonly<{
    readonly collection: CName;
    readonly model: MName;
    readonly createModel: (mongooseInstance: mongoose.Connection) => Model<DbModel>;
}>;

export type DatabaseModel<ObjectModel> = Beautifier<
    {
        insertDate: Date;
        isDeleted: boolean;
    }
    & Beautifier<ObjectModel>
>;

export type DatabaseSearchModel<ObjectModel> = DatabaseModel<ObjectModel> & {
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

export type CaptionOnly = {
    _id: ObjectId;
    caption: string;
}
