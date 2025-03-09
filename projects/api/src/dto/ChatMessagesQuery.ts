import { Expose, Type } from "class-transformer";
import { IsDefined, IsOptional, IsString, MaxLength } from "class-validator";

export default class ChatMessagesQuery {
    @Expose()
    @Type(() => String)
    @IsDefined()
    @IsString()
    @MaxLength(50)
    chatId!: string;

    @Expose()
    @Type(() => String)
    @IsOptional()
    @IsString()
    @MaxLength(50)
    lastMessageId?: string;
}