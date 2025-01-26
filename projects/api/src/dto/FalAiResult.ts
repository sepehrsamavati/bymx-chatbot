import { Expose, Type } from "class-transformer";
import type { IFalAiWebhookResult } from "bymx-core/events";
import { IsDefined, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export default class FalAiResult implements IFalAiWebhookResult {
    @Expose()
    @Type(() => String)
    @IsString()
    @IsDefined()
    @IsUUID()
    request_id!: string;

    @Expose()
    @Type(() => String)
    @IsString()
    @IsDefined()
    @IsUUID()
    gateway_request_id!: string;

    @Expose()
    @Type(() => String)
    @IsString()
    @IsDefined()
    @MinLength(1)
    @MaxLength(50)
    status!: string;

    @Expose()
    @Type(() => String)
    @IsOptional()
    @MaxLength(1000)
    error?: string;

    @Expose()
    payload!: unknown;

    @Expose()
    @Type(() => String)
    @IsOptional()
    @MaxLength(1000)
    payload_error?: string;
}