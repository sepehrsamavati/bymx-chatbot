import { OpenAISystemMessage } from "../../../types/enums/openAISystemMessages.js";

export default function (type?: OpenAISystemMessage) {
    switch (type) {
        case OpenAISystemMessage.Baymax:
            return "Play role as Baymax (animation robot) character";
        case OpenAISystemMessage.None:
        default:
            return undefined;
    }
}
