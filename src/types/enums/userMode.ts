import configError from "../../projects/core/helpers/configError.js";

const General = Object.freeze({
    Normal: 0,
    // AcceptEULA: 1,
    EnterPhoneNumber: 2
});

const ChatManagement = Object.freeze({
    ChangeTitle: 20
});

const JoinRequiredChatManagement = Object.freeze({
    AddNew: 30
});

const UserPrompt = Object.freeze({
    ImageGenerationPrompt: 40
});

const Enums = Object.freeze({
    General,
    UserPrompt,
    ChatManagement,
    JoinRequiredChatManagement,
});

type UnifiedEnums = typeof Enums[keyof typeof Enums];

const getEnumValues = <T extends UnifiedEnums>(_enum: T) => Object.values(_enum).filter(item => typeof item === "number");

const allModes: ReturnType<typeof getEnumValues> = [];

const appendToModes = (_enum: UnifiedEnums, name: string) => {
    getEnumValues(_enum)
        .forEach(value => {
            configError(
                `Duplicated enum found: '${value}' in '${name}'`,
                allModes.includes(value)
            );
            allModes.push(value);
        });
};

Object.entries(Enums).forEach(([name, _enum]) => appendToModes(_enum, name));

export const UserMode = Enums;

export const userModeValues = allModes;

export type UserModeType = typeof userModeValues[number];
