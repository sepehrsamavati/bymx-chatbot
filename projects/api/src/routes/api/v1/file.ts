import type { RouteHandlerMethod } from "fastify";
import type { CaptionOnly } from "bymx-core/types";
import { OperationResultWithData } from "bymx-core/shared";
import { fileHelper, storageHelper } from "bymx-core/server";

import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';

export const uploadAttachment: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<string>();

    if (!request.locals.user)
        return reply.status(401).send(result);

    const data = await request.file();

    if (!data)
        return reply.status(400).send(result.failed());

    const extension = fileHelper.tryGetFileExtension(data.mimetype);

    if (!fileHelper.extractableFileContentExtensions.includes(extension))
        return reply.status(400).send(result.failed("targetFileNotSupported"));

    const fileId = storageHelper.generateFileSystemId();
    const filePath = storageHelper.fileStorageHelper.userTemporary.getFilePath(fileId);

    if ((await request.locals.applications.userTempFileApplication.addTempFile({
        fsId: fileId,
        extension: extension,
        filename: data.filename,
        lastAccessed: new Date(),
        size: 0,
        user: request.locals.user,
        vectorIds: [],
    })).ok) {
        await pipeline(data.file, fs.createWriteStream(filePath));

        result.succeeded().setData(fileId);
    }

    return reply.status(200).send(result);
};
