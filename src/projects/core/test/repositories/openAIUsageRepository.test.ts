import test from "node:test";
import assert from 'node:assert';
import { sampleUser } from "../data/user.js";
import CoreServices from "../../Container.js";

test('Open AI usage repository', { todo: "Requires mock and data", skip: true },  async helpers => {
    const services = new CoreServices();

    await services.diReady();

    await helpers.test('Get user point usage', async () => {
        const now = new Date();
        const result = await services.repositories.openAIUsageRepository.userPointUsage(sampleUser.userId, now, now);
        assert.strictEqual(typeof result === "number", true);
    });

    await services.destroy();
});