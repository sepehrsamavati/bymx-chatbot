import { config } from "bymx-core/server";
import type { RouteHandlerMethod } from "fastify";
import type { CaptionOnly } from "bymx-core/types";
import { OperationResultWithData } from "bymx-core/shared";

import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

export const uploadAttachment: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<CaptionOnly[]>();


    const data = await request.file();

    if (!data)
        return reply.status(200).send(result);

    // to accumulate the file in memory! Be careful!
    //
    // await data.toBuffer() // Buffer
    //
    // or

    await pipeline(data.file, fs.createWriteStream(path.join(config.cacheDirectory, "from-api", data.filename)))

    result.succeeded();

    // be careful of permission issues on disk and not overwrite
    // sensitive files that could cause security risks

    // also, consider that if the file stream is not consumed, the promise will never fulfill

    return reply.status(200).send(result);

};
