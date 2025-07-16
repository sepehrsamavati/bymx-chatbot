import test from "node:test";
import assert from 'node:assert';
import { SampleUser } from "../data/user.js";
import CoreServices from "../../Container.js";
import { UserMode } from "../../types/enums/userMode.js";

const sampleUser = new SampleUser();

test('User application', async helpers => {
    const services = new CoreServices();

    await services.diReady();

    const newUserMode = UserMode.General.EnterPhoneNumber;

    await helpers.test('Upsert', async () => {
        const result = await services.applications.userApplication.obtain({
            lang: sampleUser.createUserPayload.lang,
            telegram: sampleUser.createUserPayload.telegram ? {
                id: sampleUser.createUserPayload.telegram.id,
                firstName: sampleUser.createUserPayload.telegram.firstName,
                inviteCount: 0,
                mode: UserMode.General.Normal,
            } : undefined,
        });
        sampleUser.createdUserId = result?.id as string;
        assert.strictEqual(typeof result?.id, "string");
    });

    await helpers.test('Set user mode', async () => {
        const result = await services.applications.userApplication.setUserMode(sampleUser.createdUserId, newUserMode);
        assert.strictEqual(result.ok, true);
    });

    await helpers.test('Upsert after set user tg mode (read changes)', async () => {
        const result = await services.applications.userApplication.obtain({
            lang: sampleUser.createUserPayload.lang,
            telegram: sampleUser.createUserPayload.telegram ? {
                id: sampleUser.createUserPayload.telegram.id,
                firstName: sampleUser.createUserPayload.telegram.firstName,
                inviteCount: 0,
                mode: UserMode.General.Normal,
            } : undefined,
        });
        assert.strictEqual(result?.telegram?.mode, newUserMode);
    });

    await services.destroy();
});