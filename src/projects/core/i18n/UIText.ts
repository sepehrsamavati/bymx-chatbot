export const langCodes = ["en", "fa"] as const;

export type LangCode = typeof langCodes[number];

const keys = [
    "hello"
] as const;

export type UITextKey = typeof keys[number];

export type UITextOptionalKey = UITextKey | (string & {});

export type UITextLanguage = {
    [Key in UITextKey]: string;
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
