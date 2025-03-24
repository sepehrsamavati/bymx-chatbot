import UIText, { LangCode, type UITextLanguage } from "../i18n/UIText.js";

const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const dateLocales = ({
    "en": "en-SE",
    "fa": "fa-IR-u-nu-latn",
} as const);

const msToSeconds = 1000;
const msToMinutes = msToSeconds * 60;
const msToHours = msToMinutes * 60;
const msToDays = msToHours * 24;
const msToWeeks = msToDays * 7;
const msToMonths = msToDays * 30;
const msToYears = msToDays * 365;

const stringHelper = {
    formatter(text: string, replaceWith: string | number | (string | number)[]) {
        const input = text;
        if (!Array.isArray(replaceWith)) {
            replaceWith = [replaceWith];
        }
        return input.replace(/(%s)\d/g, (a) => replaceWith[parseInt(a.slice(2)) - 1]?.toString());
    },
    toPersianDigits(text: number | string) {
        return text.toString().replace(/[0-9]/g, w => persianNumbers[+w]);
    },
    digitLocalization(text: number | string, locale: string) {
        if (locale === 'fa')
            return stringHelper.toPersianDigits(text);
        return text.toString();
    },
    dateLocalization(date: Date, locale: string) {
        const dateLocale = dateLocales[locale as 'en'] ?? dateLocales.en;
        return stringHelper.digitLocalization(date.toLocaleString(dateLocale), locale);
    },
    capitalizeFirstLetter(word: string) {
        if (typeof word !== 'string' || word.length === 0) {
            return '';
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    },
    thousandSeparator(numericValue: number | string) {
        return numericValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    millisecondsToHumanReadable(ms: number, localeOrUiText: UITextLanguage | LangCode) {
        const uiText = typeof localeOrUiText === 'string' ? UIText[localeOrUiText] : localeOrUiText;
        let remainingMilliseconds = ms;

        // Define time units and their corresponding values in milliseconds
        const timeUnits = [
            { unit: 'year', ms: msToYears },
            { unit: 'month', ms: msToMonths },
            { unit: 'week', ms: msToWeeks },
            { unit: 'day', ms: msToDays },
            { unit: 'hour', ms: msToHours },
            { unit: 'minute', ms: msToMinutes },
            { unit: 'second', ms: msToSeconds }
        ] as const;

        let output: string[] = [];

        for (const { unit, ms: unitMs } of timeUnits) {
            if (remainingMilliseconds >= unitMs) {
                const quantity = Math.floor(remainingMilliseconds / unitMs);
                remainingMilliseconds -= quantity * unitMs;
                output.push(`${quantity} ${stringHelper.toPlural(uiText._langCode, quantity, uiText[unit])}`);
            }

            if (output.length >= 2)
                break;
        }

        return output.join(` ${uiText.and} `);
    },
    toPlural(lang: string, count: number, word: string, postfix = 's') {
        if (lang === 'en')
            return count === 1 ? word : word + postfix;
        return word;
    },
    modelNameToTitle(modelFullName: string) {
        let modelTitle = "ERR";

        if (modelFullName.includes('/'))
            modelTitle = modelFullName.split('/').at(1)?.split('-').at(0) || modelTitle;
        else {
            const [name, version] = modelFullName.split('-');
            modelTitle = (name || modelTitle) + (version ? ` ${version}` : '');
        }

        return modelTitle.toUpperCase();
    },
    isRtl(text: string) {
        return rtlRegex.test(text.charAt(0));
    }
}

export default stringHelper;
