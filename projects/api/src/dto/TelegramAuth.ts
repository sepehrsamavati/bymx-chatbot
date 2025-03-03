import { Expose, Type } from "class-transformer";
import { IsDefined, IsNumber, IsPositive, IsString, MaxLength } from "class-validator";

export default class TelegramAuth {
    @Expose()
    @Type(() => Number)
    @IsDefined()
    @IsNumber()
    @IsPositive()
    tgId!: number;

    @Expose()
    @Type(() => Number)
    @IsDefined()
    @IsNumber()
    @IsPositive()
    date!: number;

    @Expose()
    @Type(() => String)
    @IsDefined()
    @IsString()
    @MaxLength(100)
    hash!: string;
}