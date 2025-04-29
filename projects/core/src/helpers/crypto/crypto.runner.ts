import crypto from "node:crypto";
import { logger } from "../logger.js";

const englishChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const generateSessionTokenId = async () => crypto.randomBytes(48).toString('hex');

export const generateOtpCode = async () => crypto.randomBytes(8).toString('hex');

export const generateSalt = (length = 16) => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

const password = {
    encode: (plainText: string, salt?: string) => {
        try {
            const _salt = salt ?? generateSalt();
            const encoded = crypto.pbkdf2Sync(plainText, _salt, 1e5, 64, "SHA512");
            return _salt + ':' + encoded.toString('hex');
        } catch (e: unknown) {
            logger.error("Password encrypt / " + (e instanceof Error ? e.message : e));
            return null;
        }
    },
    compare: (plainTextPassword: string, encodedPassword: string) => {
        const [passwordSalt] = encodedPassword.split(":");
        return password.encode(plainTextPassword, passwordSalt) === encodedPassword;
    }
} as const;

export const calculateSha256Hash = (key: string | Buffer, plainValue: string) => crypto.createHmac('sha256', key).update(plainValue).digest();

/** Converts to `base64url` */
export const randomString = (byteSize = 4) => crypto.randomBytes(byteSize).toString('base64url');

export const randomEnglishString = (length = 4) => {
    let result = '';

    for (let i = 0; i < length; i++) {
        result += englishChars.charAt(Math.floor(Math.random() * englishChars.length));
    }

    return result;
};

