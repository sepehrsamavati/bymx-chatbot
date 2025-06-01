import "reflect-metadata";
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
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

        this.#fastify.addHook('onRequest', (req, res, done) => {
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

        this.#setupAuth();

        setRoutes(this.#fastify);

        this.#fastify.listen({
            port: config.apiServer.port,
        })
            .then(() => {
                logger.info("Server started");
            });
    }

    #setupAuth() {
        this.#fastify.register(fastifyCookie)

        this.#fastify.register(fastifyJwt, {
            secret: config.apiServer.tokenSignSecret,
            cookie: {
                cookieName: config.apiServer.accessTokenCookieKey,
                signed: true
            },
            verify: { extractToken: (req) => req.cookies[config.apiServer.accessTokenCookieKey] },
            decode: { complete: true },
        });
    }
}
