import type { PaletteMode } from "@mui/material";

export type IUpgradeable = {
    _dataVersion: number;
}

export type LocalStorage_v1 = IUpgradeable & {
    themeName: PaletteMode;
    isLoggedIn: boolean;
    language: string;
}

export type LocalStorage_v2 = LocalStorage_v1 & {
    syncedWithTg: boolean;
}

export type LocalStorage_v3 = LocalStorage_v2 & {
    chatCount: number;
}

export type LocalStorage_v4 = LocalStorage_v3 & {
    experimentalFeatures: boolean;
}
