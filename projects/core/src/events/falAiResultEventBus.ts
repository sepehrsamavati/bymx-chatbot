import { EventEmitter } from "node:events";
import type { GenerationTask } from "../types/entities/generationTask.js";
import type { OperationResultWithData } from "../common/dto/OperationResult.js";
import type { AIGeneratedImageResponse } from "../types/contracts/aiResponse.js";

export type IFalAiWebhookResult = {
    request_id: string;
    gateway_request_id: string;
    status: string;
    error?: string;
    payload: unknown;
    payload_error?: string;
};

type IFalAiResultEvents = {
    internalProcessFinished: [OperationResultWithData<AIGeneratedImageResponse>, GenerationTask];
};

export const falAiResultEventBus = new EventEmitter<IFalAiResultEvents>();
