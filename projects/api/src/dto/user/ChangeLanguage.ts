import { UIText } from "bymx-core/shared";
import { Expose, Type } from "class-transformer";
import { IsDefined, IsEnum, IsString, MaxLength, MinLength } from "class-validator";

export default class ChangeLanguage {
    @Expose()
    @Type(() => String)
    @IsDefined()
    @IsString()
    @MinLength(1)
    @MaxLength(3)
    @IsEnum(UIText.langCodes)
    lang!: string;
}