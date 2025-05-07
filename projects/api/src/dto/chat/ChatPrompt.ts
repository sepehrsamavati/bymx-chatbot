import ChatID from "./ChatID.js";
import type { Api } from "bymx-core/types";
import { Expose, Type } from "class-transformer";
import { IsDefined, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export default class ChatPrompt extends ChatID implements Api.ChatDto.ILlmPromptRequest {
    @Expose()
    @Type(() => String)
    @IsDefined()
    @IsString()
    @MinLength(1)
    @MaxLength(2048)
    promptText!: string;

    @Expose()
    @Type(() => String)
    @IsOptional()
    @IsString()
    @MinLength(15)
    @MaxLength(55)
    attachmentFileId?: string;
}