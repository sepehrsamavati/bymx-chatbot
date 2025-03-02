// import userService from "./services/user";
// import type { IUserInfo } from "../types/user";
import type { PaletteMode } from "@mui/material";
import { createContext, useContext } from "react";
import ThemeManager from "./helper/ThemeManager";
import SessionStorageHelper from "./helper/SessionStorage";
import type { LocalStorage_v1 } from "../types/localStorage";
import { UpgradeableLocalStorageHelper } from "./helper/LocalStorage";
import { UIText } from "./i18n/i18n";
// import snackbarProvider, { closeSnackbar } from "./helper/snackbarProvider";

export default class Session {
    private _signOutLock = false;
    // private _user?: IUserInfo;
    // public get user(): IUserInfo | undefined {
    //     return this._user;
    // }
    // public set user(v: IUserInfo | undefined) {
    //     this._user = v;
    // }

    async getUserInfo() {
        // const result = await userService.getUserInfo();

        // if (result.data) {
        //     this.user = result.data;
        //     this.refreshUI();
        // } else {
        //     this.signOut();
        // }

        // return result;
    }


    constructor(
        readonly setTheme: React.Dispatch<React.SetStateAction<PaletteMode>>,
        public readonly refreshUI: () => void
    ) { }

    public readonly storage = new SessionStorageHelper();

    public readonly localStorage = new UpgradeableLocalStorageHelper<LocalStorage_v1>({
        _dataVersion: 1,
        themeName: "light",
        isLoggedIn: false,
        language: "fa",
    });

    public readonly uiText = new UIText(this.localStorage.data.language, () => this.refreshUI()).getObject();

    // public async signOut() {
    //     if (this._signOutLock) return;
    //     this._signOutLock = true;

    //     const res = await userService.userLogout();

    //     if (res.data?.isSucceeded) {
    //         this.localStorage.data.isLoggedIn = false;
    //         this.localStorage.rewrite();
    //         this.user = undefined;
    //         window.location.reload();
    //     } else {
    //         // this.snackbarProvider(res.data?.message, { variant: "error" });
    //     }

    //     this._signOutLock = false;

    //     return res.data?.isSucceeded;
    // }

    public readonly themeManager = new ThemeManager(this);
    // public readonly snackbarProvider = snackbarProvider;
    // public readonly closeSnackbar = closeSnackbar;
}

export const SessionContext = createContext({} as Session);

export const useSession = () => useContext(SessionContext);
