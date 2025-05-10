import "reflect-metadata";
import Fastify from 'fastify';
import { setRoutes } from "./routes/router.js";
import { config, IServices, logger } from "bymx-core/server";

export default class HttpServer {
    constructor(private services: IServices) {
        this.#init();
    }

    #fastify = Fastify({
        logger: true,
    });

    #init() {
        const coreServices = this.services.core;

        this.#fastify.addHook('onRequest', function (req, res, done) {
            const scope = coreServices.createApplicationScope();

            req.locals = {
                user: null,
                dto: null,
                applications: scope.applications,
            };

            res.raw.once('finish', async () => {
                await scope.dispose();
            });

            done();
        });

        setRoutes(this.#fastify);

        this.#fastify.listen({
            port: config.apiServer.port,
        })
            .then(() => {
                logger.info("Server started");
            });
    }
}
