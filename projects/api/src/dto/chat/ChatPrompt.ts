import ChatID from "./ChatID.js";
import { Expose, Type } from "class-transformer";
import { IsDefined, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export default class ChatPrompt extends ChatID {
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