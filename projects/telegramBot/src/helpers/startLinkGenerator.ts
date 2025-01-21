import type { RequestContext } from "../types/telegram.js";

function startLinkGenerator(botUsername: string, parameter: string): string;
function startLinkGenerator(context: RequestContext, parameter: string): string;
function startLinkGenerator(opt: string | RequestContext, parameter: string) {
    const botUsername = typeof opt === "string" ? opt : opt.botUsername;
    return `https://t.me/${botUsername}?start=${parameter}`;
}

export default startLinkGenerator;
