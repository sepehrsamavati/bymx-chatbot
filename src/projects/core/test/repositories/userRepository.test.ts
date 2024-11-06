import test from "node:test";
import assert from 'node:assert';
import { sampleUser } from "../data/user.js";
import CoreServices from "../../Container.js";
import type { User } from "../../../../types/entities/user.js";


test('User repository', async helpers => {
    const services = new CoreServices();

    await services.diReady();

    await helpers.test('Create', async () => {
        const createdUserId = await services.repositories.userRepository.create(sampleUser.createUserPayload);
        sampleUser.userId = createdUserId as string;
        assert.strictEqual(typeof createdUserId, "string");
    });

    await helpers.test('Get by ID', async () => {
        const result = await services.repositories.userRepository.getBy({ id: sampleUser.userId });
        const user = result as User;
        assert.notStrictEqual(result, null);
        assert.strictEqual(user.username, undefined);
        assert.strictEqual(JSON.stringify({ id: user.id, tgId: user.tgId }), JSON.stringify({ id: sampleUser.userId, tgId: sampleUser.userTgId }));
    });

    await helpers.test('Get by Telegram ID', async () => {
        const result = await services.repositories.userRepository.getBy({ tgId: sampleUser.userTgId });
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
                id: sampleUser.userId,
                tgId: sampleUser.userTgId,
                lastActivity: sampleUser.createUserPayload.lastActivity
            })
        );
    });

    await helpers.test('Get and update', async update => {
        const result = await services.repositories.userRepository.getAndUpdate({ username: sampleUser.username }, { tgId: sampleUser.userTgId });
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
                id: sampleUser.userId,
                tgId: sampleUser.userTgId,
                lastActivity: sampleUser.createUserPayload.lastActivity,
                usage: user.usage
            })
        );

        await update.test('Get by ID and check update', async () => {
            const result = await services.repositories.userRepository.getBy({ id: sampleUser.userId });
            const user = result as User;
            assert.notStrictEqual(result, null);
            assert.strictEqual(user.username, sampleUser.username);
            assert.strictEqual(user.usage, 1);
            assert.strictEqual(user.lastActivity > sampleUser.createUserPayload.lastActivity, true);
        });
    });

    await services.destroy();
});