// import userService from "./services/user";
// import type { IUserInfo } from "../types/user";
import type { PaletteMode } from "@mui/material";
import { createContext, useContext } from "react";
import ThemeManager from "./helper/ThemeManager";
import SessionStorageHelper from "./helper/SessionStorage";
import type { LocalStorage_v1 } from "../types/localStorage";
import { UpgradeableLocalStorageHelper } from "./helper/LocalStorage";
import { UIText } from "./i18n/i18n";
import type { CaptionOnly, UserEntity } from "bymx-core/types";
import userService from "./services/userService";
import modelService from "./services/modelService";
// import snackbarProvider, { closeSnackbar } from "./helper/snackbarProvider";

export default class Session {
    private _signOutLock = false;
    private _user?: UserEntity.UserViewModel;
    public get user(): UserEntity.UserViewModel | undefined {
        return this._user;
    }
    public set user(v: UserEntity.UserViewModel | undefined) {
        this._user = v;
    }

    async getUserInfo() {
        const response = await userService.telegramAuth();

        if (response.result.data) {
            this.user = response.result.data;
            this.refreshUI();
            this.syncChatModels();
        } else {
            this.signOut();
        }

        return response;
    }

    async syncChatModels() {
        const models = (await modelService.getAll()).result.data;
        if (Array.isArray(models)) {
            this._chatModels = models;
            this.refreshUI();
        }
    }

    private _chatModels: CaptionOnly[] = [];
    public get chatModels(): CaptionOnly[] {
        return this._chatModels;
    }
    public set chatModels(v: CaptionOnly[]) {
        this._chatModels = v;
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

    /** @todo */
    public async signOut() {
        return true;
        // if (this._signOutLock) return;
        // this._signOutLock = true;

        // const res = await userService.logout();

        // if (res.data?.isSucceeded) {
        //     this.localStorage.data.isLoggedIn = false;
        //     this.localStorage.rewrite();
        //     this.user = undefined;
        //     window.location.reload();
        // } else {
        //     // this.snackbarProvider(res.data?.message, { variant: "error" });
        // }

        // this._signOutLock = false;

        // return res.data?.isSucceeded;
    }

    public readonly themeManager = new ThemeManager(this);
    // public readonly snackbarProvider = snackbarProvider;
    // public readonly closeSnackbar = closeSnackbar;
}

export const SessionContext = createContext({} as Session);

export const useSession = () => useContext(SessionContext);
