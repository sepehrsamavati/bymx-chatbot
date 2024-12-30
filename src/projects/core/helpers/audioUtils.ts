import path from "node:path";
import fs from "node:fs/promises";
import ffmpeg from 'fluent-ffmpeg';
import config from "../config.js";
import ffmpegPath from 'ffmpeg-static';
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { errorLogger } from "../helpers/logger.js";
import { path as ffprobePath } from 'ffprobe-static';

ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfprobePath(ffprobePath);

export async function audioConvert(inBuffer: Buffer, format: string) {
    return new Promise<Buffer | null>(resolve => {
        // const outputBuffer: Buffer[] = [];
        const outputTempPath = path.join(config.cacheDirectory, `audio-convert-${randomUUID()}.temp`);

        // Create a readable stream from the input buffer
        const inputStream = new Readable();
        inputStream.push(inBuffer);
        inputStream.push(null); // Signal the end of the stream

        ffmpeg(inputStream)
            .toFormat(format)
            .on('end', async () => {
                let outBuff: Buffer | null = null;
                try {
                    outBuff = await fs.readFile(outputTempPath);
                    await fs.unlink(outputTempPath);
                } catch (err) {
                    errorLogger(`audioConvert read-unlink temp file (${outputTempPath})`, err);
                    return resolve(null);
                }
                resolve(outBuff);
            })
            .on('error', err => {
                errorLogger('Error during audio conversion:', err);
                resolve(null);
            })
            .save(outputTempPath);
    });
}

export async function getAudioDuration(inBuffer: Buffer): Promise<number | null> {
    const tempFilePath = path.join(config.cacheDirectory, `audio-duration-${randomUUID()}.temp`);

    try {
        await fs.writeFile(tempFilePath, inBuffer);
    } catch (err) {
        errorLogger(`getAudioDuration write temp file (${tempFilePath})`, err);
        return null;
    }

    const unlinkTempFile = () => {
        fs.unlink(tempFilePath)
            .catch(err => errorLogger(`getAudioDuration unlink temp file (${tempFilePath})`, err));
    };

    return new Promise(resolve => {
        ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
            if (err) {
                errorLogger("getAudioDuration ffprobe", err);
                unlinkTempFile();
                return resolve(null);
            }
            const duration = metadata.format.duration;
            unlinkTempFile();
            resolve(duration ?? null);
        });
    });
}
