import test from "node:test";
import assert from 'node:assert';
import { SampleUser } from "../data/user.js";
import CoreServices from "../../Container.js";
import type { User } from "../../../../types/entities/user.js";

const sampleUser = new SampleUser();

test('Open AI usage repository', async helpers => {
    const services = new CoreServices();

    await services.diReady();

    const user = await services.applications.userApplication.upsert(sampleUser.createUserPayload) as User;
    const models = await services.repositories.openAIModelRepository.getAll() ?? [];
    const model = models[0];

    if (!model) {
        console.warn("Exiting usage repo test; No model is defined to use");
        await services.destroy();
        return;
    }

    let usage = 0;
    const addUsagePoints = 20;
    const last5min = new Date();
    last5min.setMinutes(last5min.getMinutes() - 5);

    await helpers.test('Get user point usage should return number', async () => {
        const now = new Date();
        const result = await services.repositories.openAIUsageRepository.userPointUsage(user.id, last5min, now) as number;
        usage = result;
        assert.strictEqual(typeof result === "number", true);
        assert.strictEqual(result >= 0, true);
    });

    await helpers.test('Add user point usage', async () => {
        const result = await services.repositories.openAIUsageRepository.create({
            cost: 0,
            points: addUsagePoints,
            insertDate: new Date(),
            isDeleted: false,
            user: user,
            model: model
        });
        assert.strictEqual(result, true);
    });

    await helpers.test('Get user point usage should increase after add', async () => {
        const now = new Date();
        const result = await services.repositories.openAIUsageRepository.userPointUsage(user.id, last5min, now) as number;
        assert.strictEqual(typeof result === "number", true);
        assert.strictEqual(result, usage + addUsagePoints);
    });

    await services.destroy();
});