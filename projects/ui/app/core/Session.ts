import { UIText } from "./i18n/i18n";
import colors from "./config/colors";
import { stringHelper } from "bymx-core/shared";
import ThemeManager from "./helper/ThemeManager";
import userService from "./services/userService";
import { createContext, useContext } from "react";
import modelService from "./services/modelService";
import SessionStorageHelper from "./helper/SessionStorage";
import type { Direction, PaletteMode } from "@mui/material";
import type { LocalStorage_v3 } from "../types/localStorage";
import type { CaptionOnly, UserEntity } from "bymx-core/types";
import { UpgradeableLocalStorageHelper } from "./helper/LocalStorage";
import snackbarProvider, { closeSnackbar } from "./helper/snackbarProvider";

type CacheStorageItem<T> = {
    data: T;
    /** Date.now() */
    date: number;
};

export default class Session {
    private _signOutLock = false;
    private _user?: UserEntity.UserViewModel;
    public get user(): UserEntity.UserViewModel | undefined {
        return this._user;
    }
    public set user(v: UserEntity.UserViewModel | undefined) {
        this._user = v;
    }

    async tgWebAppAuth() {
        this.syncUiWithTelegramApp();

        const response = await userService.telegramAuth(window.Telegram.WebApp.initData);

        if (response.result?.data) {
            console.log(this)
            this.user = response.result.data;
            console.log(this)
            if (this.user.lang !== this.localStorage.data.language)
                this.languageChange(this.user.lang, true);
            this.postLoginEvents();
        } else {
            this.snackbarProvider(response.result?.message, { variant: "error" });
            this.signOut();

            if (response.result?.message === "sendPhoneNumberInBotToContinue")
                setTimeout(() => {
                    if (typeof window.Telegram?.WebApp?.close === "function")
                        window.Telegram.WebApp.close();
                }, 5e3);
        }

        return response;
    }

    postLoginEvents() {
        this.refreshUI();
        this.syncChatModels();
        this.localStorage.data.isLoggedIn = true;
        this.localStorage.rewrite();
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
                const _color = this.themeManager.name === "light" ? "#ffffff" : "#000000";
                window.Telegram.WebApp.setBottomBarColor(
                    _color
                );
                window.Telegram.WebApp.setHeaderColor(
                    _color
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
        const models = (await modelService.getAll()).result?.data;
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
    ) {
        if (this.localStorage.data.isLoggedIn)
            this.postLoginEvents();
    }

    public readonly storage = new SessionStorageHelper();

    public readonly localStorage = new UpgradeableLocalStorageHelper<LocalStorage_v3>({
        _dataVersion: 3,
        syncedWithTg: false,
        themeName: "light",
        isLoggedIn: false,
        language: "en",
        chatCount: 0,
    });

    public fixDirection(targetDirection: Direction) {
        const langDir = stringHelper.langCodeToDirection(this.uiText._langCode);
        if (langDir === "ltr")
            return targetDirection; // no change
        else
            return targetDirection === "rtl" ? "ltr" : "rtl"; // invert
    }

    private refreshUiText() {
        const uit = new UIText(this.localStorage.data.language, () => this.refreshUI()).getObject();
        this.uiText = uit;
        return uit;
    }

    public uiText = this.refreshUiText();

    languageChange(langCode: string, softRefresh = false) {
        this.localStorage.data.language = langCode;
        this.localStorage.rewrite();
        if (softRefresh) {
            this.refreshUiText();
        }
        else
            window.location.reload();
    }

    readonly cacheStorage: {
        profileInfo?: CacheStorageItem<UserEntity.UserInfoViewModel>;
    } = {};

    public requestSideMenuOpen?: () => void;

    /** @todo */
    public async signOut() {
        this.localStorage.data.isLoggedIn = false;
        this.localStorage.rewrite();
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
    public readonly snackbarProvider = (...args: Parameters<typeof snackbarProvider>) => {
        return snackbarProvider(args[0], {
            ...args[1],
            extendedOptions: {
                uiText: this.uiText,
                ...args[1]?.extendedOptions
            },
        });
    };
    public readonly closeSnackbar = closeSnackbar;
}

export const SessionContext = createContext({} as Session);

export const useSession = () => useContext(SessionContext);
