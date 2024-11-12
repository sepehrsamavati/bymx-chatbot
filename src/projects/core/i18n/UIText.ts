import faData from "./languages/fa.json" assert { type: 'json' };

export const langCodes = ["fa"] as const;

export type LangCode = typeof langCodes[number];

const keys = [
    "_tgStart",
    "_tgHelp",

    "panel",
    "chats",
    "dailyFreePoints",
    "saveAndUseHistory",
    "memoryAmount",
    "enabled",
    "disabled",
    "return",
    "savedChats",
    "newChat",
    "noSavedChats",
    "selectModel",
    "chatCreatedSuccessfully",
    "changeTitle",
    "titleTooLong",
    "noTitle",
    "title",
    "model",
    "sendNewTitle",
    "changeTitleFailed",
    "titleChangedSuccessfully",
    "activateSaveMessages",
    "deactivateSaveMessages",
    "lowCost",
    "affordable",
    "costly",
    "models",
    "help",
    "modelsAndCosts",
    "termsOfService",
    "modelUsageHelper",
    "modelUsageMemoryWarningHelper",
    "approximateMessageCount",
] as const;

export type UITextKey = typeof keys[number];

export type UITextOptionalKey = UITextKey | (string & {});

export type UITextLanguage = {
    [Key in UITextKey]: string;
};

type UITextObject = {
    [Key in LangCode]: UITextLanguage;
};

const UIText: UITextObject = {
    fa: faData,
};

export default UIText;
