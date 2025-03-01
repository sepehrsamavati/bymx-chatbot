type SessionStorageItem<T> = {
    readonly key: string;
    value: T;
}

export default class SessionStorageHelper {
    private _initPath: SessionStorageItem<string> = {
        key: "initPath",
        value: ""
    };
    public get initPath() {
        return this._initPath.value;
    }

    constructor() {
        let initPath = window.sessionStorage.getItem(this._initPath.key);
        if (!initPath) {
            initPath = window.location.pathname;
            window.sessionStorage.setItem(this._initPath.key, initPath);
        }
        this._initPath.value = initPath;
    }
}