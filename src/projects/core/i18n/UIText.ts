import faData from "./languages/fa.json" with { type: 'json' };

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
    "modelProcessedThisMessage",
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
    "restart",
    "modelsCost",
    "fileNotSupported",
    "targetFileNotSupported",
    "stillProcessingPreviousFile",
    "onlyPdfIsSupported",
    "fileUploadLimitReached",
    "fileProcessingLimitReached",
    "fileSizeExceededError",
    "selectedModelNoFileSearch",
    "adminPanel",
    "statistics",
    "users",
    "todaysRequests",
    "todaysPointUsage",
    "todaysCost",
    "userNotFound",
    "noAccessToBan",
    "userAlreadyBanned",
    "cantModifyOwner",
    "cantBanYourself",
    "noAccessToBan",
    "userIsNotBanned",
    "operationSuccessful",
    "operationFailed",
    "noJoinRequiredChat",
    "joinRequiredChats",
    "joinRequired",
    "add",
    "forwardMessageFromChannel",
    "cancel",
    "chatAlreadyExists",
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
