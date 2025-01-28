import { randomBytes } from "node:crypto";

export const randomNumber = (length = 5) => Math.floor(Math.pow(10, length - 1) + Math.random() * (9 * Math.pow(10, length - 1)));

export const randomHexString = (length = 20) => randomBytes(length).toString('hex');
