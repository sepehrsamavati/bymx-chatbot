import { Expose, Type } from "class-transformer";
import { IsDefined, IsString, MaxLength, MinLength } from "class-validator";

export default class ChatID {
    @Expose()
    @Type(() => String)
    @IsDefined()
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    chatId!: string;
}