const keys = [
] as const;

export type I18nKey = typeof keys[number];
export type I18nLanguage = Record<I18nKey, string>;

const emptyLanguageData: I18nLanguage = Object.fromEntries(
    keys.map((key) => [key, ""]) // Map over keys and create key-value pairs with empty strings
) as I18nLanguage;

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
            const data = await import(`./${language}.json`);
            // Step 3: If the data is valid, update the language data
            this.#languageData = data.default;
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
