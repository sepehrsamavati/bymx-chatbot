import ChatID from "./ChatID.js";
import { Expose, Type } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

export default class ChatMessagesQuery extends ChatID {
    @Expose()
    @Type(() => String)
    @IsOptional()
    @IsString()
    @MaxLength(50)
    lastMessageId?: string;
}