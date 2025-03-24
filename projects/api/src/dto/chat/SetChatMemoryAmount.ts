import ChatID from "./ChatID.js";
import { Expose, Type } from "class-transformer";
import { AIChatHistoryMemory } from "bymx-core/shared";
import { IsDefined, IsEnum, IsNumber } from "class-validator";

export default class SetChatMemoryAmount extends ChatID {
    @Expose()
    @Type(() => Number)
    @IsDefined()
    @IsNumber()
    @IsEnum(AIChatHistoryMemory)
    amount!: AIChatHistoryMemory;
}