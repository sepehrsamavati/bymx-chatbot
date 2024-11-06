import test from "node:test";
import assert from 'node:assert';
import { SampleUser } from "../data/user.js";
import CoreServices from "../../Container.js";
import { UserMode } from "../../../../types/enums/userMode.js";

const sampleUser = new SampleUser();

test('User application', async helpers => {
    const services = new CoreServices();

    await services.diReady();

    const newUserMode = UserMode.General.EnterPhoneNumber;

    await helpers.test('Upsert', async () => {
        const result = await services.applications.userApplication.upsert({
            firstName: sampleUser.createUserPayload.firstName,
            lang: sampleUser.createUserPayload.lang,
            tgId: sampleUser.createUserPayload.tgId
        });
        sampleUser.createdUserId = result?.id as string;
        assert.strictEqual(typeof result?.id, "string");
    });

    await helpers.test('Set user mode', async () => {
        const result = await services.applications.userApplication.setUserMode(sampleUser.createdUserId, newUserMode);
        assert.strictEqual(result.ok, true);
    });

    await helpers.test('Upsert after set user mode (read changes)', async () => {
        const result = await services.applications.userApplication.upsert({
            firstName: sampleUser.createUserPayload.firstName,
            lang: sampleUser.createUserPayload.lang,
            tgId: sampleUser.createUserPayload.tgId
        });
        assert.strictEqual(result?.mode, newUserMode);
    });

    await services.destroy();
});