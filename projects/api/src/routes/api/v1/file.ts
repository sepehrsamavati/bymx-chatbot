import fs from 'node:fs';
import type IdDto from "../../../dto/IdDto.js";
import { pipeline } from 'node:stream/promises';
import type { RouteHandlerMethod } from "fastify";
import { fileHelper, storageHelper } from "bymx-core/server";
import { OperationResult, OperationResultWithData } from "bymx-core/shared";

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
