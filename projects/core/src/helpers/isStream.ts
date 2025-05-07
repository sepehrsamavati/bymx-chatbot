import type { Stream } from "openai/streaming.js";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";

export function isChatCompletionStream(
    response: unknown
): response is Stream<ChatCompletionChunk> {
    return typeof response === "object" && response !== null && Symbol.asyncIterator in response;
}
