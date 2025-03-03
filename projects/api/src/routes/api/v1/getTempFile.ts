import fs from "node:fs/promises";
import mimetype from 'mime-types';
import { storageHelper } from "bymx-core/server";
import type { RouteHandlerMethod } from "fastify";

export default (async function (request, reply) {

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

} satisfies RouteHandlerMethod)
