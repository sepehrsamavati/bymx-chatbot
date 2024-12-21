import test from "node:test";
import assert from 'node:assert';
import CoreServices from "../../Container.js";

test('AI model repository', async helpers => {
    const services = new CoreServices();

    await services.diReady();

    await helpers.test('Get all', async () => {
        const result = await services.repositories.aiModelRepository.getAll();
        assert.strictEqual(Array.isArray(result), true);
        assert.strictEqual(result?.every(item => typeof item.id === "string"), true);
    });

    await helpers.test('Exists', async () => {
        const result = await services.repositories.aiModelRepository.exists("");
        assert.strictEqual(typeof result === "boolean", true);
    });

    await services.destroy();
});