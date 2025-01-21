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
    }
}

export default stringHelper;
