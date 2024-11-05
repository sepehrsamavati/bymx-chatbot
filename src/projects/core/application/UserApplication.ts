import type { ServicesType } from "../Container.js";
import { UserMode } from "../../../types/enums/userMode.js";
import { UserType } from "../../../types/enums/userTypes.js";
import { UserStatus } from "../../../types/enums/userStatus.js";
import type { UpsertUserModel } from "../../../types/entities/user.js";

export default class UserApplication {
    #userRepository;

    constructor(container: ServicesType) {
        this.#userRepository = container.userRepository;
    }

    async upsert(user: UpsertUserModel) {

        const _user = await this.#userRepository.getAndUpdate(user, { tgId: user.tgId });

        if (_user) {
            return _user;
        } else {
            const userId = await this.#userRepository.create({
                ...user,
                usage: 0,
                isDeleted: false,
                insertDate: new Date(),
                lastActivity: Date.now(),
                mode: UserMode.General.Normal,
                status: UserStatus.EULA,
                type: UserType.Normal,
            });

            if (!userId)
                return null;

            const _user = await this.#userRepository.getBy({ id: userId });

            return _user;
        }
    }
}