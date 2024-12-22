import fs from "node:fs/promises";
import ffmpeg from 'fluent-ffmpeg';
import config from "../config.js";
import ffmpegPath from 'ffmpeg-static';
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { logger } from "../helpers/logger.js";

ffmpeg.setFfmpegPath(ffmpegPath as string);

export async function audioConvert(inBuffer: Buffer, format: string) {
    return new Promise<Buffer>((resolve, reject) => {
        // const outputBuffer: Buffer[] = [];
        const outputTempPath = config.cacheDirectory + `/${randomUUID()}.temp`;

        // Create a readable stream from the input buffer
        const inputStream = new Readable();
        inputStream.push(inBuffer);
        inputStream.push(null); // Signal the end of the stream

        ffmpeg(inputStream)
            .toFormat(format)
            .on('end', async () => {
                const outBuff = await fs.readFile(outputTempPath);
                await fs.unlink(outputTempPath);
                resolve(outBuff);
            })
            .on('error', (err) => {
                logger.error('Error during conversion:', err.message);
                reject(err);
            })
            .save(outputTempPath);
    });
}