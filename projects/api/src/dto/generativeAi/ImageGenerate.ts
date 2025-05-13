import { Expose, Type } from "class-transformer";
import { IsDefined, IsNumber, IsString, MaxLength, MinLength } from "class-validator";

export default class ImageGenerate {
    @Expose()
    @Type(() => String)
    @IsDefined()
    @IsString()
    @MinLength(10)
    @MaxLength(500)
    prompt!: string;

    @Expose()
    @Type(() => Number)
    @IsDefined()
    @IsNumber()
    @MinLength(1)
    @MaxLength(1)
    type: number = 1;
}