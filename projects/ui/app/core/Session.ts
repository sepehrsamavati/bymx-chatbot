// import userService from "./services/user";
// import type { IUserInfo } from "../types/user";
import type { PaletteMode } from "@mui/material";
import { createContext, useContext } from "react";
import ThemeManager from "./helper/ThemeManager";
import SessionStorageHelper from "./helper/SessionStorage";
import type { LocalStorage_v2 } from "../types/localStorage";
import { UpgradeableLocalStorageHelper } from "./helper/LocalStorage";
import { UIText } from "./i18n/i18n";
import type { CaptionOnly, UserEntity } from "bymx-core/types";
import userService from "./services/userService";
import modelService from "./services/modelService";
import colors from "./config/colors";
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
        this.syncUiWithTelegramApp();

        const response = await userService.telegramAuth(window.Telegram.WebApp.initData);

        if (response.result.data) {
            this.user = response.result.data;
            this.refreshUI();
            this.syncChatModels();
        } else {
            this.signOut();
        }

        return response;
    }

    syncUiWithTelegramApp() {
        try {
            if (!this.localStorage.data.syncedWithTg && ["light", "dark"].includes(window.Telegram?.WebApp?.colorScheme)) {

                this.localStorage.data.themeName = window.Telegram.WebApp.colorScheme;
                this.localStorage.data.syncedWithTg = true;

                this.localStorage.rewrite();
                this.refreshUI();
            }

            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.setBottomBarColor(
                    colors.brand
                );
                window.Telegram.WebApp.setHeaderColor(
                    colors.brand
                );
                window.Telegram.WebApp.setBackgroundColor(
                    window.Telegram?.WebApp?.colorScheme === "light"
                        ? colors.backgroundLightMode
                        : colors.backgroundDarkMode
                );
            }
        } catch { }
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

    public readonly localStorage = new UpgradeableLocalStorageHelper<LocalStorage_v2>({
        _dataVersion: 2,
        syncedWithTg: false,
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
