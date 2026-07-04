import colors from "../config/colors";
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

    #syncWithCss() {
        document.documentElement.style.setProperty("--background-color", this.name === "light" ? colors.backgroundLightMode : colors.backgroundDarkMode);
    }

    public set(name: PaletteMode) {
        this._name = name;

        if (typeof this.#session.setTheme === "function")
            this.#session.setTheme(name);

        this.#session.localStorage.data.themeName = name;
        this.#session.localStorage.rewrite();

        this.#syncWithCss();
        this.#session.syncUiWithTelegramApp();
        this.#session.refreshUI?.();
    }
}