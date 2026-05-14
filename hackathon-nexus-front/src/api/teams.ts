export interface TeamMemberDto {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  position?: string;
  skills: string[];
  yearsOfExperience?: number;
}

export interface TeamRequestItem {
  id: string;
  type: "join_request" | "invite";
  teamId: string;
  teamName: string;
  hackathonId: string;
  participant: TeamMemberDto & { userId: string };
  createdAt: string;
}

export interface TeamDto {
  id: string;
  name: string;
  hackathonId: string;
  leaderId: string;
  members: TeamMemberDto[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamsPage {
  teams: TeamDto[];
  total: number;
  page: number;
  limit: number;
}

export interface MembersPage {
  members: TeamMemberDto[];
  total: number;
  page: number;
  limit: number;
}

export interface FindTeamsParams {
  hackathonId: string;
  name?: string;
  skills?: string[];
  positions?: string[];
  minExperience?: number;
  page?: number;
  limit?: number;
}

export interface FindMembersParams {
  name?: string;
  skills?: string[];
  positions?: string[];
  minExperience?: number;
  page?: number;
  limit?: number;
}

import { request } from "./client";

export function getMyTeam(token: string, hackathonId: string): Promise<TeamDto | null> {
  return request<TeamDto | null>(`/teams/my?hackathonId=${encodeURIComponent(hackathonId)}`, token);
}

export function createTeam(token: string, name: string, hackathonId: string): Promise<TeamDto> {
  return request<TeamDto>("/teams", token, {
    method: "POST",
    body: JSON.stringify({ name, hackathonId }),
  });
}

export function findTeams(token: string, params: FindTeamsParams): Promise<TeamsPage> {
  const qs = new URLSearchParams();
  qs.set("hackathonId", params.hackathonId);
  if (params.name) qs.set("name", params.name);
  if (params.minExperience !== undefined) qs.set("minExperience", String(params.minExperience));
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  params.skills?.forEach((s) => qs.append("skills", s));
  params.positions?.forEach((p) => qs.append("positions", p));
  return request<TeamsPage>(`/teams/recommend?${qs}`, token);
}

export function findMembers(
  token: string,
  teamId: string,
  params: FindMembersParams = {},
): Promise<MembersPage> {
  const qs = new URLSearchParams();
  if (params.name) qs.set("name", params.name);
  if (params.minExperience !== undefined) qs.set("minExperience", String(params.minExperience));
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  params.skills?.forEach((s) => qs.append("skills", s));
  params.positions?.forEach((p) => qs.append("positions", p));
  const query = qs.toString() ? `?${qs}` : "";
  return request<MembersPage>(`/teams/${teamId}/recommend-members${query}`, token);
}

export function deleteTeam(token: string, teamId: string): Promise<void> {
  return request<void>(`/teams/${teamId}`, token, { method: "DELETE" });
}

export function kickMember(token: string, teamId: string, participantId: string): Promise<TeamDto> {
  return request<TeamDto>(`/teams/${teamId}/members/${participantId}`, token, {
    method: "DELETE",
  });
}

export function getTeamRequests(token: string, teamId: string): Promise<TeamRequestItem[]> {
  return request<TeamRequestItem[]>(`/teams/${teamId}/requests`, token);
}

export function getMyInvites(token: string): Promise<TeamRequestItem[]> {
  return request<TeamRequestItem[]>(`/teams/invites`, token);
}
