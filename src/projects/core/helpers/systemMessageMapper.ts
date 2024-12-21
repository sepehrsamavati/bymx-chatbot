import { AIChatBehavior } from "../../../types/enums/aiChatBehavior.js";

export default function (type?: AIChatBehavior) {
    switch (type) {
        case AIChatBehavior.Baymax:
            return "Play role as Baymax (animation robot) character";
        case AIChatBehavior.None:
        default:
            return undefined;
    }
}
