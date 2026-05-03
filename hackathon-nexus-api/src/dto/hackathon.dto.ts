import { Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { HackathonTopic } from "../models/enums";

export class CreateHackathonDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(HackathonTopic)
  topic!: HackathonTopic;

  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @IsInt()
  @Min(1)
  durationHours!: number;

  @IsInt()
  @Min(1)
  maxTeamSize!: number;
}

export class UpdateHackathonDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(HackathonTopic)
  topic?: HackathonTopic;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationHours?: number;
}
