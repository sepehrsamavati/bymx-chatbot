import { UserMode } from "../../../../types/enums/userMode.js";
import { UserType } from "../../../../types/enums/userTypes.js";
import { UserStatus } from "../../../../types/enums/userStatus.js";
import type { CreateUserModel } from "../../../../types/entities/user.js";

class SampleUser {
    userId = "";

    get userTgId() {
        return 123456;
    }

    get username() {
        return "test_user";
    }

    #createPayload: CreateUserModel = {
        firstName: "UserFirstName",
        insertDate: new Date(),
        isDeleted: false,
        lastActivity: Date.now(),
        mode: UserMode.General.Normal,
        lang: "en",
        status: UserStatus.OK,
        tgId: this.userTgId,
        type: UserType.Normal,
        usage: 0
    };

    get createUserPayload() {
        return this.#createPayload;
    }
}

export const sampleUser = new SampleUser();