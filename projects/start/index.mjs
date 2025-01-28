// @ts-check
import HttpServer from "bymx-api-server";
import { UpdateProvider } from "bymx-tg-endpoint";
import { CoreServices, errorLogger, PaymentServices } from "bymx-core/server";

/**
 * @typedef {import("bymx-core/server").IServices} IServices
 */

const coreServices = new CoreServices();
const paymentServices = new PaymentServices();

/**
 * @type {IServices}
 */
const services = {
    core: coreServices,
    payment: paymentServices,
    dispose: () => {
        Promise.all(
            [
                coreServices.destroy(),
                paymentServices.destroy(),
            ]
        )
            .catch(err => errorLogger("Services dispose error", err));
    }
};

await Promise.all([
    coreServices.diReady(),
    paymentServices.diReady(),
]);

const apiServer = new HttpServer(services);
const telegramBot = new UpdateProvider(services);
