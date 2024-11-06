import test from "node:test";
import assert from 'node:assert';
import CoreServices from "../../Container.js";

test('User application', { todo: "Requires mock and data", skip: true }, async helpers => {
    const services = new CoreServices();

    await services.diReady();

    await helpers.test('Upsert', async () => {
    });

    await helpers.test('Set user mode', async () => {
    });

    await services.destroy();
});