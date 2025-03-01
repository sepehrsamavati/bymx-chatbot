import type { IUpgradeable } from "../../types/localStorage";

export default class LocalStorageHelper<T extends Object> {
    private static itemKey = "bymx_v1";

    protected defaultData: T;

    private _data: T;
    public get data(): T {
        return this._data;
    }

    constructor(defaultData: T) {
        this.defaultData = JSON.parse(JSON.stringify(defaultData));
        const data = this.read();
        if (!data) {
            this.write(defaultData);
            this._data = defaultData;
        } else {
            this._data = data;
        }
    }

    private read(): T | null {
        try {
            const stringifiedData = localStorage.getItem(LocalStorageHelper.itemKey);
            const data = JSON.parse(stringifiedData ?? "");
            this._data = { ...data };
            return data;
        } catch {
            return null;
        }
    }

    write(data: T) {
        localStorage.setItem(LocalStorageHelper.itemKey, JSON.stringify(data));
        this._data = data;
    }

    rewrite() {
        localStorage.setItem(LocalStorageHelper.itemKey, JSON.stringify(this._data));
    }

    reset() {
        this.write(JSON.parse(JSON.stringify(this.defaultData)));
    }
}

export class UpgradeableLocalStorageHelper<T extends IUpgradeable> extends LocalStorageHelper<T> {
    constructor(...args: ConstructorParameters<typeof LocalStorageHelper<T>>) {
        super(...args);
        this.syncVersion();
    }

    private dataHasVersion(data?: T) {
        return typeof data?._dataVersion === "number";
    }

    private syncVersion() {
        if(
            this.dataHasVersion(this.data) && this.dataHasVersion(this.defaultData)
            && this.data._dataVersion < this.defaultData._dataVersion // should upgrade
        ) {
            const keys = Object.keys(this.defaultData) as (keyof T)[];
            
            for(const key of keys) {
                if(!this.data.hasOwnProperty(key)) {
                    this.data[key] = this.defaultData[key];
                }
            }

            this.data._dataVersion = this.defaultData._dataVersion;

            this.rewrite();
        }
    }
}
