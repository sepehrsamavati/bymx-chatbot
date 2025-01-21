import process from "node:process";
import { ExitCode } from "../types/enums/exitCodes.js";

export default function exitHelper(code: ExitCode) {
    console.info(`ℹ Exiting process with code '${code}' (${ExitCode[code]})`);
    process.exit(code);
}
