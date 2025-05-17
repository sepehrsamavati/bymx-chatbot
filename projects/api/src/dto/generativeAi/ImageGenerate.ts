import { Api } from "bymx-core/types";
import { Expose, Type } from "class-transformer";
import { IsDefined, IsNumber, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export default class ImageGenerate implements Api.GenerativeAi.IImageGenerateRequest {
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
    @Min(1)
    @Max(1)
    type: 1 = 1;
}