export type Beautifier<Obj> = {
    [K in keyof Obj]: Obj[K];
};