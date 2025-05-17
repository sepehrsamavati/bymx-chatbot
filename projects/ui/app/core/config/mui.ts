import colors from './colors';
import { prefixer } from 'stylis';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { faIR } from '@mui/material/locale';
import { colors as muiColors } from "@mui/material";
import type ThemeManager from '../helper/ThemeManager';
import { createTheme, type Direction } from '@mui/material/styles';

const ThemeNames = ['light', 'dark'] as const;

export type ThemeName = typeof ThemeNames[number];

export const cacheRtl = (languageDirection: Direction) => languageDirection === "rtl" ? (
    createCache({
        key: 'muirtl',
        stylisPlugins: [prefixer, rtlPlugin],
    })
) : (
    createCache({
        key: 'muiltr',
    })
);

export const muiThemeOptions = (themeManager: ThemeManager, languageDirection: Direction) => {
    const theme = themeManager.name;
    const _colors = colors;

    return createTheme({
        direction: languageDirection,
        palette: {
            mode: theme,
            primary: {
                main: theme === 'light' ? _colors.brand : _colors.brandDarkMode,
            },
            secondary: {
                main: _colors.brandSecondary,
            },
            error: {
                main: _colors.error,
            },
            background: {
                default: theme === 'light' ? _colors.backgroundLightMode : _colors.backgroundDarkMode,
                paper: theme === 'light' ? muiColors.grey[300] : muiColors.grey[900]
            }
        },
        typography: {
            fontSize: 16,
            fontFamily: `"Samim", "Roboto", "Helvetica", sans-serif, "Arial"`
        },
        components: {
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: theme === 'light' ? _colors.antiFlashWhite : _colors.backgroundDarkMode
                    }
                }
            },
            MuiLink: {
                styleOverrides: {
                    root: {
                        textDecoration: 'none',
                    },
                },
            },
            // @ts-ignore
            MuiDataGrid: {
                styleOverrides: {
                    withBorderColor: {
                        borderColor: _colors.brand
                    }
                }
            },
            // @ts-ignore
            MuiTabs: {
                styleOverrides: {
                    indicator: {
                        backgroundColor: theme === 'light' ? _colors.backgroundDarkMode : _colors.backgroundLightMode
                    }
                }
            }
        },
    }, faIR);
};
