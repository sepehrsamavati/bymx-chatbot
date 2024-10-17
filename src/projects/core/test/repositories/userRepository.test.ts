import test from "node:test";
import assert from 'node:assert';
import CoreServices from "../../Container.js";
import { UserMode } from "../../../../types/enums/userMode.js";
import { UserTier } from "../../../../types/enums/userTier.js";
import { UserType } from "../../../../types/enums/userTypes.js";
import { UserStatus } from "../../../../types/enums/userStatus.js";
import type { CreateUserModel, User } from "../../../../types/entities/user.js";


test('User repository', async helpers => {
    const services = new CoreServices();

    await services.diReady();

    const userTgId = 123456;
    let userId: string = "";
    const createUserPayload: CreateUserModel = {
        firstName: "UserFirstName",
        insertDate: new Date(),
        isDeleted: false,
        lastActivity: Date.now(),
        mode: UserMode.General.Normal,
        status: UserStatus.OK,
        tgId: userTgId,
        tier: UserTier.Free,
        type: UserType.Normal,
        usage: 0
    };

    await helpers.test('Create', async () => {
        const createdUserId = await services.repositories.userRepository.create(createUserPayload);
        userId = createdUserId as string;
        assert.strictEqual(typeof createdUserId, "string");
    });

    await helpers.test('Get by ID', async () => {
        const result = await services.repositories.userRepository.getBy({ id: userId });
        const user = result as User;
        assert.notStrictEqual(result, null);
        assert.strictEqual(user.username, undefined);
        assert.strictEqual(JSON.stringify({ id: user.id, tgId: user.tgId }), JSON.stringify({ id: userId, tgId: userTgId }));
    });

    await helpers.test('Get by Telegram ID', async () => {
        const result = await services.repositories.userRepository.getBy({ tgId: userTgId });
        const user = result as User;
        assert.notStrictEqual(result, null);
        assert.strictEqual(user.username, undefined);
        assert.strictEqual(
            JSON.stringify({
                id: user.id,
                tgId: user.tgId,
                lastActivity: user.lastActivity
            }),
            JSON.stringify({
                id: userId,
                tgId: userTgId,
                lastActivity: createUserPayload.lastActivity
            })
        );
    });

    const username = "test_user";

    await helpers.test('Get and update', async update => {
        const result = await services.repositories.userRepository.getAndUpdate(username, { tgId: userTgId });
        const user = result as User;
        assert.notStrictEqual(result, null);
        assert.strictEqual(user.username, undefined);
        assert.strictEqual(
            JSON.stringify({
                id: user.id,
                tgId: user.tgId,
                lastActivity: user.lastActivity,
                usage: user.usage
            }),
            JSON.stringify({
                id: userId,
                tgId: userTgId,
                lastActivity: createUserPayload.lastActivity,
                usage: user.usage
            })
        );

        await update.test('Get by ID and check update', async () => {
            const result = await services.repositories.userRepository.getBy({ id: userId });
            const user = result as User;
            assert.notStrictEqual(result, null);
            assert.strictEqual(user.username, username);
            assert.strictEqual(user.usage, 1);
            assert.strictEqual(user.lastActivity > createUserPayload.lastActivity, true);
        });
    });

    await services.destroy();
});