import { Expose, Type } from "class-transformer";
import { IsDefined, IsString, MaxLength, MinLength } from "class-validator";

export default class ChatPrompt {
    @Expose()
    @Type(() => String)
    @IsDefined()
    @IsString()
    @MaxLength(50)
    chatId!: string;

    @Expose()
    @Type(() => String)
    @IsDefined()
    @IsString()
    @MinLength(1)
    @MaxLength(2048)
    promptText!: string;
}