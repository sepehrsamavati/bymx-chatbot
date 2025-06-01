import ChatID from "./ChatID.js";
import { Expose, Type } from "class-transformer";
import { IsDefined, IsMongoId, IsString } from "class-validator";

export default class SetChatModel extends ChatID {
    @Expose()
    @Type(() => String)
    @IsDefined()
    @IsString()
    @IsMongoId()
    modelId!: string;
}