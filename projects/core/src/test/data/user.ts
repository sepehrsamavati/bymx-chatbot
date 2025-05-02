import { UserMode } from "../../types/enums/userMode.js";
import { UserType } from "../../types/enums/userTypes.js";
import { randomHexString, randomNumber } from "./random.js";
import { UserStatus } from "../../types/enums/userStatus.js";
import type { CreateUserModel } from "../../types/entities/user.js";

export class SampleUser {
    createdUserId = "";

    readonly userTgId = randomNumber(6);
    readonly tgUsername = "test_" + randomHexString();
    readonly createUserPayload: CreateUserModel = {
        insertDate: new Date(),
        isDeleted: false,
        lastActivity: Date.now(),
        lang: "fa",
        status: UserStatus.OK,
        type: UserType.Normal,
        usage: 0,
        memoryAmount: 3,
        saveMessages: false,
        telegram: {
            id: this.userTgId,
            firstName: "UserFirstName",
            inviteCount: 0,
            mode: UserMode.General.Normal,
        },
        voiceResponse: {
            on: false,
            type: "alloy",
        },
    };
}
