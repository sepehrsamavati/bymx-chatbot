import ChatID from "./ChatID.js";
import { Expose, Type } from "class-transformer";
import { IsDefined, IsString, MaxLength, MinLength } from "class-validator";

export default class ChatDeleteMessagesAfter extends ChatID {
    @Expose()
    @Type(() => String)
    @IsDefined()
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    messageId!: string;
}