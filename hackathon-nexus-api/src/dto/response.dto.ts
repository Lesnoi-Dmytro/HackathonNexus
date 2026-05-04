import { HackathonTopic, Position, Skill, UserRole } from "../models/enums";
import { AppNotification } from "../socket/notifications";

export class ParticipantDto {
  id!: string;
  experience?: string;
  yearsOfExperience?: number;
  skills!: Skill[];
  position?: Position;
  createdAt!: Date;
  updatedAt!: Date;
}

export class UserDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  role!: UserRole;
  participant?: ParticipantDto;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AuthResponseDto {
  accessToken!: string;
  user!: UserDto;
}

export class HackathonDto {
  id!: string;
  createdById!: string;
  title!: string;
  description!: string;
  topic!: HackathonTopic;
  startDate!: Date;
  durationHours!: number;
  maxTeamSize!: number;
  maxParticipants?: number;
  participantCount!: number;
  registrationFull!: boolean;
  isRegistered!: boolean;
  imageUrl?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class HackathonsPageDto {
  data!: HackathonDto[];
  total!: number;
  page!: number;
  limit!: number;
}

export class TeamMemberDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  position?: Position;
  skills!: Skill[];
  yearsOfExperience?: number;
}

export class TeamDto {
  id!: string;
  name!: string;
  hackathonId!: string;
  leaderId!: string;
  members!: TeamMemberDto[];
  createdAt!: Date;
  updatedAt!: Date;
}

export class ScoredSkillDto {
  skill!: string;
  score!: number;
}

export class ScoredPositionDto {
  position!: string;
  score!: number;
}

export class TeamsRecommendResponseDto {
  teams!: TeamDto[];
  total!: number;
  page!: number;
  limit!: number;
  recommendedSkills?: ScoredSkillDto[];
  recommendedPositions?: ScoredPositionDto[];
}

export class MembersRecommendResponseDto {
  members!: TeamMemberDto[];
  total!: number;
  page!: number;
  limit!: number;
  recommendedSkills?: ScoredSkillDto[];
  recommendedPositions?: ScoredPositionDto[];
}

export class NotificationDto {
  id!: string;
  payload!: AppNotification;
  read!: boolean;
  createdAt!: Date;
}

export class NotificationsPageDto {
  data!: NotificationDto[];
  total!: number;
  page!: number;
  limit!: number;
}
