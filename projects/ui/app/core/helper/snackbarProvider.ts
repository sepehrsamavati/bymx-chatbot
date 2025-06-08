import React from 'react'
import type { I18nKey, I18nLanguage } from '../i18n/i18n';
import { useSnackbar, type ProviderContext, type OptionsWithExtraProps, type VariantType, type SnackbarMessage, type SnackbarKey } from 'notistack';

let useSnackbarRef: ProviderContext;
export const SnackbarProviderConfigurator: React.FC = () => {
    useSnackbarRef = useSnackbar();
    return null;
}

type ExtendedOptions = {
    title?: string;
    multiline?: boolean;
    uiText: I18nLanguage;
};

const snackbarProvider = (msg: SnackbarMessage, options?: { extendedOptions?: ExtendedOptions } & OptionsWithExtraProps<VariantType>) => {
    const defaultOptions: OptionsWithExtraProps<VariantType> = {
        variant: "default",
        autoHideDuration: 8e3,
        anchorOrigin: {
            vertical: "top",
            horizontal: "center"
        }
    };

    if (typeof msg === "string" && options?.extendedOptions?.uiText)
        msg = options.extendedOptions.uiText[msg as I18nKey] || msg;

    const { extendedOptions } = options ?? {};
    if (extendedOptions?.multiline && typeof msg === "string") {
        // add <br /> instead of \n
        const lines = msg.split('\n');
        const elements = lines.flatMap((item, index) => (index === lines.length - 1 ? [item] : [item, React.createElement('br')]));

        // add title
        if (extendedOptions.title) {
            elements.unshift(React.createElement('h3', {}, [extendedOptions.title]));
        }

        msg = React.createElement('div', {}, elements);
    }

    if (!msg || msg === "null" || msg === "undefined")
        msg = "❌";

    return useSnackbarRef.enqueueSnackbar<VariantType>(msg, options ? { ...defaultOptions, ...options } : defaultOptions);
};

export const closeSnackbar = (key: SnackbarKey) => {
    return useSnackbarRef.closeSnackbar(key);
};

export default snackbarProvider;