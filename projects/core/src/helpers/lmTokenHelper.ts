import models from "@dqbd/tiktoken/model_to_encoding.json" with { type: 'json' };
import { get_encoding, encoding_for_model, type TiktokenModel } from "@dqbd/tiktoken";

function getEncodingForModel(modelName: string) {
    const _modelName = modelName as TiktokenModel;
    const modelNameIsValid = Boolean(models[_modelName]);
    return modelNameIsValid ? encoding_for_model(_modelName) : get_encoding("cl100k_base");
}

export function countTokens(text: string, model: string) {
    const enc = getEncodingForModel(model);
    const tokens = enc.encode(text);
    return tokens.length;
}

export function truncateText(text: string, model: string, maxTokens: number) {
    const enc = getEncodingForModel(model);
    const tokens = enc.encode(text);
    const truncatedTokens = tokens.slice(0, maxTokens);
    return enc.decode(truncatedTokens);
}
