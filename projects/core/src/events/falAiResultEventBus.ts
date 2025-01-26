import { EventEmitter } from "node:events";
import type { GenerationTask } from "../types/entities/generationTask.js";

export type IFalAiWebhookResult = {
    request_id: string;
    gateway_request_id: string;
    status: string;
    error?: string;
    payload: unknown;
    payload_error?: string;
};

type IFalAiResultEvents = {
    externalProcessFinished: [IFalAiWebhookResult];
    internalProcessFinished: [GenerationTask];
};

export const falAiResultEventBus = new EventEmitter<IFalAiResultEvents>();
