export const langCodes = ["en", "fa"] as const;

export type LangCode = typeof langCodes[number];

const keys = [
    "hello"
] as const;

export type UITextLanguage = {
    [Key in typeof keys[number]]: string;
};

type UITextObject = {
    [Key in LangCode]: UITextLanguage;
};

const UIText = {} as UITextObject;

for (const langCode of langCodes) {
    const data = {} as UITextLanguage;

    for (const key of keys) {
        data[key] = "";
    }

    UIText[langCode] = data;
}
