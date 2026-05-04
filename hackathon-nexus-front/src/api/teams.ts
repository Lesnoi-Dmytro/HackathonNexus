export interface TeamMemberDto {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  skills: string[];
  yearsOfExperience?: number;
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

export interface ScoredItem {
  skill?: string;
  position?: string;
  score: number;
}

export interface TeamsPage {
  teams: TeamDto[];
  total: number;
  page: number;
  limit: number;
  recommendedSkills?: ScoredItem[];
  recommendedPositions?: ScoredItem[];
}

export interface MembersPage {
  members: TeamMemberDto[];
  total: number;
  page: number;
  limit: number;
  recommendedSkills?: ScoredItem[];
  recommendedPositions?: ScoredItem[];
}

export interface FindTeamsParams {
  hackathonId: string;
  name?: string;
  skills?: string[];
  positions?: string[];
  page?: number;
  limit?: number;
}

export interface FindMembersParams {
  name?: string;
  skills?: string[];
  positions?: string[];
  page?: number;
  limit?: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

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
  const url = new URL(`${API_BASE}/teams/recommend`);
  url.searchParams.set("hackathonId", params.hackathonId);
  if (params.name) url.searchParams.set("name", params.name);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  params.skills?.forEach((s) => url.searchParams.append("skills", s));
  params.positions?.forEach((p) => url.searchParams.append("positions", p));
  return request<TeamsPage>(url.pathname + url.search, token);
}

export function findMembers(
  token: string,
  teamId: string,
  params: FindMembersParams = {},
): Promise<MembersPage> {
  const url = new URL(`${API_BASE}/teams/${teamId}/recommend-members`);
  if (params.name) url.searchParams.set("name", params.name);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  params.skills?.forEach((s) => url.searchParams.append("skills", s));
  params.positions?.forEach((p) => url.searchParams.append("positions", p));
  return request<MembersPage>(url.pathname + url.search, token);
}
