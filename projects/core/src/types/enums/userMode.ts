const General = Object.freeze({
    Normal: 0,
    // AcceptEULA: 1,
    EnterPhoneNumber: 2,
    StaticPayment: 10,
});

const Manager = Object.freeze({
    SetStaticPaymentGatewayId: 100,
    SetStaticPaymentRejectReason: 101,
});

const ChatManagement = Object.freeze({
    ChangeTitle: 20
});

const JoinRequiredChatManagement = Object.freeze({
    AddNew: 30
});

const UserPrompt = Object.freeze({
    ImageGenerationPrompt: 40,
    MusicWithLyricsAndTemplateGeneration: 41,
    Create3dModel: 42,
    ImageUpscale: 43,
});

const Enums = Object.freeze({
    General,
    Manager,
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
            if(allModes.includes(value))
                throw new Error(`Duplicated enum found: '${value}' in '${name}'`);
            allModes.push(value);
        });
};

Object.entries(Enums).forEach(([name, _enum]) => appendToModes(_enum, name));

export const UserMode = Enums;

export const userModeValues = allModes;

export type UserModeType = typeof userModeValues[number];
