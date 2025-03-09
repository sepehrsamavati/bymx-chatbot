import uitService from "../services/uitService";
import type { UIText as CoreUIText } from "bymx-core/shared";

export type I18nKey = CoreUIText.UITextKey;
export type I18nLanguage = Record<I18nKey, string>;

const emptyLanguageData = {} as I18nLanguage;

// const languageMap = {
//     fa: () => import("./fa.json"),
// };

export class UIText {
    #instance;
    #rerender;
    #languageData: I18nLanguage | null = null;

    constructor(language: string, rerender: () => void) {
        this.loadLanguageData(language);
        this.#rerender = rerender;

        const getLanguageData = () => this.#languageData;
        this.#instance = new Proxy(emptyLanguageData, {
            get(_target: I18nLanguage, prop: string) {
                const target = getLanguageData() || _target;
                if (prop in target && target[prop as I18nKey]) {
                    return target[prop as I18nKey];
                }
                // throw new Error(`Key "${prop}" not found in language data.`);
                return prop;
            },
        });
    }

    private async loadLanguageData(language: string) {
        try {
            const importer = uitService.getLanguageData;
            if (!importer)
                return;

            const { result: { data } } = await importer(language);
            if (data)
                this.#languageData = data;
        } catch (error) {
            console.error(`Failed to load language data for "${language}":`, error);
            // Optional: You could reset to default data if loading fails
            this.#languageData = emptyLanguageData;
        }
        this.#rerender();
    }

    // Get the current instance (proxy)
    getObject() {
        return this.#instance;
    }
}
