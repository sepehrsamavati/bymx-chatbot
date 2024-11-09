import { randomHexString, randomNumber } from "./random.js";
import { UserMode } from "../../../../types/enums/userMode.js";
import { UserType } from "../../../../types/enums/userTypes.js";
import { UserStatus } from "../../../../types/enums/userStatus.js";
import type { CreateUserModel } from "../../../../types/entities/user.js";

export class SampleUser {
    createdUserId = "";

    readonly userTgId = randomNumber(6);
    readonly username = "test_" + randomHexString();
    readonly createUserPayload: CreateUserModel = {
        firstName: "UserFirstName",
        insertDate: new Date(),
        isDeleted: false,
        lastActivity: Date.now(),
        mode: UserMode.General.Normal,
        lang: "fa",
        status: UserStatus.OK,
        tgId: this.userTgId,
        type: UserType.Normal,
        usage: 0
    };
}
