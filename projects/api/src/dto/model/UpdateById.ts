import { Expose, Type } from "class-transformer";
import type { AiModelEntity } from "bymx-core/types";
import { IsBoolean, IsDefined, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from "class-validator";

type ILlmInfo = AiModelEntity.AIModel['llmInfo'];
type IPricePmu = AiModelEntity.AIModel['pricePmu'];

class LlmInfo implements ILlmInfo {
    @Expose()
    @Type(() => Number)
    @IsNumber()
    @IsDefined()
    @Min(0)
    contextWindow!: number;

    @Expose()
    @Type(() => Number)
    @IsNumber()
    @IsDefined()
    @Min(0)
    maxOutputTokens!: number;

    @Expose()
    @Type(() => Boolean)
    @IsBoolean()
    @IsDefined()
    canStream!: boolean;
}

class PricePmu implements IPricePmu {
    @Expose()
    @Type(() => Number)
    @IsNumber()
    @IsDefined()
    @Min(0)
    input!: number;

    @Expose()
    @Type(() => Number)
    @IsNumber()
    @IsDefined()
    @Min(0)
    output!: number;
}

export default class UpdateById implements Partial<AiModelEntity.AIModel> {
    @Expose()
    @Type(() => String)
    @IsString()
    @IsDefined()
    id!: string;

    @Expose()
    @Type(() => Boolean)
    @IsBoolean()
    @IsDefined()
    isDeleted?: boolean;

    @Expose()
    @Type(() => String)
    @IsString()
    @IsOptional()
    @MinLength(1)
    @MaxLength(50)
    title?: string;

    @Expose()
    @Type(() => String)
    @IsString()
    @IsOptional()
    @MinLength(1)
    @MaxLength(50)
    name?: string;

    @Expose()
    @ValidateNested()
    llmInfo?: LlmInfo;

    @Expose()
    @ValidateNested()
    pricePmu?: PricePmu;
}