import Session from "../Session";
import type { PaletteMode } from "@mui/material";

export default class ThemeManager {
    #session;

    constructor(
        session: Session
    ) {
        this.#session = session;
        this._name = this.#session.localStorage.data?.themeName ?? 'light';
        this.set(this._name);
    }

    private _name: PaletteMode;
    public get name(): PaletteMode {
        return this._name;
    }

    public set(name: PaletteMode) {
        this._name = name;

        if (typeof this.#session.setTheme === "function")
            this.#session.setTheme(name);

        this.#session.localStorage.data.themeName = name;
        this.#session.localStorage.rewrite();

        this.#session.syncUiWithTelegramApp();
    }
}