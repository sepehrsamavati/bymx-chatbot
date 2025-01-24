import "reflect-metadata";
import Fastify from 'fastify';
import fs from "node:fs/promises";
import mimetype from 'mime-types';
import { config, IServices, logger, storageHelper } from "bymx-core/server";
import { dtoValidator } from './middlewares/dtoValidator.js';
import FalAiResult from './dto/FalAiResult.js';

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

        this.#fastify.register((instance, _, next) => {

            instance.get("/tempFile/:id", async (request, reply) => {
                const { id } = request.params as { id: string };

                if (typeof id === "string" && id.length > 0) {
                    const tempFile = await request.locals.applications.userTempFileApplication.getByFsId(id);

                    if (tempFile.ok && tempFile.data) {
                        const filePath = storageHelper.getTempFilePath({
                            extension: tempFile.data.extension,
                            fsId: tempFile.data.fsId,
                        });

                        const file = await fs.readFile(filePath);

                        if (file) {
                            reply
                                .header('Content-Type', mimetype.lookup(tempFile.data.extension) || "application/octet-stream")
                                .send(file);
                        } else {
                            reply.status(404).send({ error: "File not found" });
                        }

                    }
                    else {
                        reply.status(404).send({ error: "Invalid id" });
                    }

                } else {
                    reply.status(400).send({ error: "Invalid id" });
                }
            });

            instance.post("/setTaskResult/fal-ai/:id",
                { preValidation: dtoValidator(FalAiResult) },
                async (request, reply) => {
                    const { id } = request.params as { id: string };

                    if (typeof id !== "string" || id.length > 40 || id.length === 0) {
                        reply.status(400).send({ error: "Invalid id" });
                    }
                });

            next();
        }, { prefix: "/api/v1" });

        this.#fastify.listen({
            port: config.apiServer.port,
        })
            .then(() => {
                logger.info("Server started");
            });
    }
}
