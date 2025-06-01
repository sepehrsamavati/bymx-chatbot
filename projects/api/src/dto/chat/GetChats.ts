import { Expose, Type } from "class-transformer";
import { IsMongoId, IsOptional, IsString } from "class-validator";

export default class GetChats {
    @Expose()
    @Type(() => String)
    @IsOptional()
    @IsString()
    @IsMongoId()
    cursorChatId?: string;
}