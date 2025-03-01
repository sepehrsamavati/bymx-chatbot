import type { PaletteMode } from "@mui/material";

export type IUpgradeable = {
    _dataVersion: number;
}

export type LocalStorage_v1 = IUpgradeable & {
    themeName: PaletteMode;
    isLoggedIn: boolean;
}
