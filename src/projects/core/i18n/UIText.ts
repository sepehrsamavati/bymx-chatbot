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
    "changeModel",
    "titleTooLong",
    "noTitle",
    "title",
    "model",
    "sendNewTitle",
    "changeTitleFailed",
    "changeModelFailed",
    "titleChangedSuccessfully",
    "itemChangedSuccessfully",
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
    "shouldGivePhoneNumber",
    "clickBottomButton",
    "sendPhoneNumber",
    "phoneNumberNotSupported",
    "phoneNumberNotValid",
    "youHavePendingPrompts",
    "noActiveSubscription",
    "freePointsFinished",
    "noPointAvailable",
    "planPointsFinished",
    "buyPlans",
    "subscription",
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

export const getUit = (uit: UITextLanguage, keyOrMessage: UITextOptionalKey) => uit[keyOrMessage as UITextKey] || keyOrMessage;

export default UIText;
