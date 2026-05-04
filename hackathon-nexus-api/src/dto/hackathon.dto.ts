import { Transform, Type } from "class-transformer";
import {
    IsBoolean,
    IsDate,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
} from "class-validator";
import { HackathonTopic } from "../models/enums";

export class ListHackathonsQueryDto {
  @IsOptional()
  @IsEnum(HackathonTopic)
  topic?: HackathonTopic;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  search?: string;

  /** When true, exclude hackathons that have already started */
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  notStarted?: boolean;

  /** When true, exclude hackathons that have already ended */
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  notEnded?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

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

  @IsOptional()
  @IsInt()
  @Min(1)
  maxParticipants?: number;
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

  @IsOptional()
  @IsInt()
  @Min(1)
  maxParticipants?: number;
}
