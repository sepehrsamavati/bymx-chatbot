import ChatID from "./ChatID.js";
import { Expose, Type } from "class-transformer";
import { IsMongoId, IsOptional, IsString } from "class-validator";

export default class ChatMessagesQuery extends ChatID {
    @Expose()
    @Type(() => String)
    @IsOptional()
    @IsString()
    @IsMongoId()
    lastMessageId?: string;
}