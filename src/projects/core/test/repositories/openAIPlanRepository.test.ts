import test from "node:test";
import assert from 'node:assert';
import CoreServices from "../../Container.js";

test('Open AI plan repository', async helpers => {
    const services = new CoreServices();

    await services.diReady();

    await helpers.test('Get many', async () => {
        const result = await services.repositories.openAIPlanRepository.getMany({});
        assert.strictEqual(Array.isArray(result), true);
        assert.strictEqual(result?.every(item => typeof item.id === "string"), true);
    });

    await services.destroy();
});