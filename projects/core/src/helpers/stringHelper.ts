import UIText, { LangCode, type UITextLanguage } from "../i18n/UIText.js";

const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
const dateLocales = ({
    "en": "en-SE",
    "fa": "fa-IR-u-nu-latn",
} as const);

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
        let seconds = Math.floor(ms / 1000);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);
        let days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        let output: string[] = [];

        if (years > 0) {
            output.push(`${years} ${stringHelper.toPlural(uiText._langCode, years, uiText.year)}`);
            days -= years * 365;
        }

        if (months > 0) {
            output.push(`${months} ${stringHelper.toPlural(uiText._langCode, months, uiText.month)} `);
            days -= months * 30;
        }

        if (weeks > 0) {
            output.push(`${weeks} ${stringHelper.toPlural(uiText._langCode, weeks, uiText.week)}`);
            days -= weeks * 7;
        }

        if (days > 0) {
            output.push(`${days} ${stringHelper.toPlural(uiText._langCode, days, uiText.day)}`);
            hours -= days * 24;
        }

        if (output.length <= 1) {
            if (hours > 0) {
                output.push(`${hours} ${stringHelper.toPlural(uiText._langCode, hours, uiText.hour)}`);
                minutes -= hours * 60;
            }

            if (minutes > 0) {
                output.push(`${minutes} ${stringHelper.toPlural(uiText._langCode, minutes, uiText.minute)}`);
                seconds -= minutes * 60;
            }

            if (seconds > 0) {
                output.push(`${seconds} ${stringHelper.toPlural(uiText._langCode, seconds, uiText.second)}`);
            }
        }

        return output.join(` ${uiText.and} `);
    },
    toPlural(lang: string, count: number, word: string, postfix = 's') {
        if (lang === 'en')
            return count === 1 ? word : word + postfix;
        return word;
    }
}

export default stringHelper;
