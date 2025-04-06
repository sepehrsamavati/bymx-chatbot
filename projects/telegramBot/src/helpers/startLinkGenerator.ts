import type { RequestContext } from "../types/telegram.js";

function startLinkGenerator(botUsername: string): string;
function startLinkGenerator(botUsername: string, parameter: string): string;
function startLinkGenerator(context: RequestContext, parameter: string): string;
function startLinkGenerator(opt: string | RequestContext, parameter?: string) {
    const botUsername = typeof opt === "string" ? opt : opt.botUsername;

    if (parameter)
        return `https://t.me/${botUsername}?start=${parameter}`;
    else
        return `https://t.me/${botUsername}?start`;
}

export default startLinkGenerator;
