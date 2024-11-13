import faData from "./languages/fa.json" assert { type: 'json' };

export const langCodes = ["fa"] as const;

export type LangCode = typeof langCodes[number];

const keys = [
    "_tgStart",
    "_tgHelp",
    "_termsOfService",

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
    "errorOccurred",
    "operationFailed",
    "reachedChatCountLimit",
    "modelsAndCosts",
    "termsOfService",
    "modelUsageHelper",
    "modelUsageMemoryWarningHelper",
    "approximateMessageCount",
    "shouldAcceptTermsOfService",
    "acceptTos",
    "delete",
    "confirm",
    "confirmToDelete",
    "selectChatBeforeUse",
    "usedPointsForThisMessage",
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
