import fs from 'node:fs';
import { Readable } from "node:stream";
import type IdDto from "../../../dto/IdDto.js";
import { pipeline } from 'node:stream/promises';
import type { RouteHandlerMethod } from "fastify";
import { errorLogger, fileHelper, storageHelper } from "bymx-core/server";
import { GenerationTaskStatus, OperationResult, OperationResultWithData } from "bymx-core/shared";

const MAX_SIZE = 10 * 1024 * 1024;

export const uploadAttachment: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<string>();

    if (!request.locals.user)
        return reply.status(401).send(result);

    if (!(await request.locals.applications.userTempFileApplication.getUserUsageStatus(request.locals.user.id)).ok)
        return reply.status(429).send(result.failed("fileUploadLimitReached"));

    const data = await request.file({
        limits: {
            fileSize: MAX_SIZE
        }
    });

    if (!data)
        return reply.status(400).send(result.failed());

    const extension = fileHelper.tryGetFileExtension(data.mimetype);

    if (!fileHelper.extractableFileContentExtensions.includes(extension))
        return reply.status(400).send(result.failed("targetFileNotSupported"));

    const fileId = storageHelper.generateFileSystemId();
    const tempFile = storageHelper.fileStorageHelper.userTemporary.tempFile(fileId);

    try {
        await pipeline(data.file, fs.createWriteStream(tempFile.path));
    } catch (err) {
        errorLogger("HTTP server saving attachment file to FS", err);
    }

    const storeResult = await request.locals.applications.userTempFileApplication
        .addTempFile({
            fsId: fileId,
            extension: extension,
            filename: data.filename,
            lastAccessed: new Date(),
            size: data.file.bytesRead,
            user: request.locals.user,
            vectorIds: [],
        });

    if (storeResult.ok) {
        if (await tempFile.acceptFile())
            result.succeeded().setData(fileId);
        else // try to rollback
            await request.locals.applications.userTempFileApplication.deleteByFsId(fileId);
    }

    return reply.status(200).send(result);
};

export const deleteAttachment: RouteHandlerMethod = async (request, reply) => {

    let result = new OperationResult();

    if (!request.locals.user)
        return reply.status(401).send(result);

    const fsId = (request.locals.dto as IdDto).id;
    const tempFile = await request.locals.applications.userTempFileApplication.getByFsId(fsId);

    if (tempFile.data?.user === request.locals.user.id)
        result = await request.locals.applications.userTempFileApplication.deleteByFsId(tempFile.data.fsId);
    else
        result.failed();

    return reply.status(200).send(result);
};

export const getTaskFile: RouteHandlerMethod = async (request, reply) => {

    const taskInternalId = (request.locals.dto as IdDto).id;

    if (!request.locals.user)
        return reply.status(401).send({});

    const { data: task } = await request.locals.applications.generationTaskApplication.getByInternalId(taskInternalId);

    if (!task)
        return reply.status(404).send({});

    if (task.user.id !== request.locals.user.id)
        return reply.status(403).send({});

    if (task.status !== GenerationTaskStatus.OK)
        return reply.status(412).send({});

    const urlToFetch = typeof task.result === "object" && task.result
        && 'images' in task.result && Array.isArray(task.result.images)
        && task.result.images.at(0)?.url;

    if (typeof urlToFetch !== "string" || !URL.canParse(urlToFetch))
        return reply.status(400).send({});

    try {
        const response = await fetch(urlToFetch, { method: "GET" });
        if (response.body)
            // @ts-ignore
            return reply.status(200).send(Readable.fromWeb(response.body));

    } catch (err) {
        return reply.status(503).send({});
    }

    return reply.status(400).send({});
};
