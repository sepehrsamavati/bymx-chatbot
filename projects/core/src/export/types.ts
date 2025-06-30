import * as ApiChatDto from "../types/contracts/api/dto/chat.js";
import * as ApiWebSocket from "../types/contracts/api/webSocket.js";
import * as ApiGenerativeAiDto from "../types/contracts/api/dto/generativeAi.js";

export namespace Api {
    export import ChatDto = ApiChatDto;
    export import WebSocket = ApiWebSocket;
    export import GenerativeAi = ApiGenerativeAiDto;
}

export type * as UserEntity from "../types/entities/user.js";
export type * as PlanEntity from "../types/entities/plan.js";
export type * as AiChatEntity from "../types/entities/aiChat.js";
export type { CaptionOnly } from "../types/contracts/entities.js";
export type { PromptViewModel } from "../types/entities/prompt.js";
export type * as AiModelEntity from "../types/entities/aiModel.js";
export type { IDisposable } from "../types/contracts/disposable.js";
export type * as TelegramApiContract from "../types/contracts/telegram.js";
export type * as UserTempFileEntity from "../types/entities/userTempFile.js";
export type * as GenerationTaskEntity from "../types/entities/generationTask.js";
export type * as TelegramBroadcastEntity from "../types/entities/telegramBroadcast.js";
export type * as TelegramJoinRequiredChatEntity from "../types/entities/telegramJoinRequiredChat.js";
export type { IOperationResult, IOperationResultWithData } from "../types/contracts/operationResult.js";
export type * as PaymentEntity from "../infrastructure/services/staticPayment/types/entities/payment.js";
