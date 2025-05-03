import test from "node:test";
import assert from 'node:assert';
import { SampleUser } from "../data/user.js";
import CoreServices from "../../Container.js";
import type { User } from "../../types/entities/user.js";

const sampleUser = new SampleUser();

test('User repository', async helpers => {
    const services = new CoreServices();

    await services.diReady();

    await helpers.test('Create', async () => {
        const createdUserId = await services.repositories.userRepository.create(sampleUser.createUserPayload);
        sampleUser.createdUserId = createdUserId as string;
        assert.strictEqual(typeof createdUserId, "string");
    });

    await helpers.test('Get by ID', async () => {
        const result = await services.repositories.userRepository.getBy({ id: sampleUser.createdUserId });
        const user = result as User;
        assert.notStrictEqual(result, null);
        assert.strictEqual(user.telegram?.username, undefined);
        assert.strictEqual(JSON.stringify({ id: user.id, tgId: user.telegram?.id }), JSON.stringify({ id: sampleUser.createdUserId, tgId: sampleUser.userTgId }));
    });

    await helpers.test('Get by Telegram ID', async () => {
        const result = await services.repositories.userRepository.getBy({ telegram: { id: sampleUser.userTgId } });
        const user = result as User;
        assert.notStrictEqual(result, null);
        assert.strictEqual(user.telegram?.username, undefined);
        assert.strictEqual(
            JSON.stringify({
                id: user.id,
                tgId: user.telegram?.id,
                lastActivity: user.lastActivity
            }),
            JSON.stringify({
                id: sampleUser.createdUserId,
                tgId: sampleUser.userTgId,
                lastActivity: sampleUser.createUserPayload.lastActivity
            })
        );
    });

    await helpers.test('Get and update', async update => {
        const result = await services.repositories.userRepository.getAndUpdate({ telegramUsername: sampleUser.tgUsername }, { telegram: { id: sampleUser.userTgId } });
        const user = result as User;
        assert.notStrictEqual(result, null);
        assert.strictEqual(user.telegram?.username, undefined);
        assert.strictEqual(
            JSON.stringify({
                id: user.id,
                tgId: user.telegram?.id,
                lastActivity: user.lastActivity,
                usage: user.usage
            }),
            JSON.stringify({
                id: sampleUser.createdUserId,
                tgId: sampleUser.userTgId,
                lastActivity: sampleUser.createUserPayload.lastActivity,
                usage: user.usage
            })
        );

        await update.test('Get by ID and check update', async () => {
            const result = await services.repositories.userRepository.getBy({ id: sampleUser.createdUserId });
            const user = result as User;
            assert.notStrictEqual(result, null);
            assert.strictEqual(user.telegram?.username, sampleUser.tgUsername);
            assert.strictEqual(user.usage, 1);
            assert.strictEqual(user.lastActivity > sampleUser.createUserPayload.lastActivity, true);
        });
    });

    await services.destroy();
});