import colors from './colors';
import { prefixer } from 'stylis';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { faIR } from '@mui/material/locale';
import { createTheme } from '@mui/material/styles';
import type ThemeManager from '../helper/ThemeManager';

const ThemeNames = ['light', 'dark'] as const;

export type ThemeName = typeof ThemeNames[number];

export const cacheRtl = createCache({
    key: 'muirtl',
    stylisPlugins: [prefixer, rtlPlugin],
});

export const muiThemeOptions = (themeManager: ThemeManager) => {
    const theme = themeManager.name;
    const _colors = colors;

    return createTheme({
        direction: 'rtl',
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
                paper: theme === 'light' ? _colors.antiFlashWhite : _colors.brand
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
