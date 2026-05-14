export type HackathonTopic =
  | "AI / Machine Learning"
  | "AR / VR"
  | "Blockchain / Web3"
  | "Cybersecurity"
  | "FinTech"
  | "Game Development"
  | "HealthTech"
  | "IoT & Embedded"
  | "Mobile Development"
  | "Web Development";

export const ALL_TOPICS: HackathonTopic[] = [
  "AI / Machine Learning",
  "AR / VR",
  "Blockchain / Web3",
  "Cybersecurity",
  "FinTech",
  "Game Development",
  "HealthTech",
  "IoT & Embedded",
  "Mobile Development",
  "Web Development",
];

export interface HackathonDto {
  id: string;
  createdById: string;
  title: string;
  description: string;
  topic: HackathonTopic;
  startDate: string;
  durationHours: number;
  maxTeamSize: number;
  maxParticipants?: number;
  participantCount: number;
  registrationFull: boolean;
  isRegistered: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HackathonsPage {
  data: HackathonDto[];
  total: number;
  page: number;
  limit: number;
}

export interface ListHackathonsParams {
  topic?: HackathonTopic;
  search?: string;
  notStarted?: boolean;
  notEnded?: boolean;
  registeredOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateHackathonPayload {
  title: string;
  description: string;
  topic: HackathonTopic;
  startDate: string;
  durationHours: number;
  maxTeamSize: number;
  maxParticipants?: number;
}

import { request } from "./client";

export async function listHackathons(
  token: string | null | undefined,
  params: ListHackathonsParams = {},
): Promise<HackathonsPage> {
  const qs = new URLSearchParams();
  if (params.topic) qs.set("topic", params.topic);
  if (params.search) qs.set("search", params.search);
  if (params.notStarted) qs.set("notStarted", "true");
  if (params.notEnded) qs.set("notEnded", "true");
  if (params.registeredOnly) qs.set("registeredOnly", "true");
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs}` : "";

  return request<HackathonsPage>(`/hackathons${query}`, token ?? undefined);
}

export function getHackathon(token: string | null, id: string): Promise<HackathonDto> {
  return request<HackathonDto>(`/hackathons/${id}`, token ?? undefined);
}

export function registerForHackathon(token: string, id: string): Promise<HackathonDto> {
  return request<HackathonDto>(`/hackathons/${id}/register`, token, { method: "POST" });
}

export function unregisterFromHackathon(token: string, id: string): Promise<void> {
  return request<void>(`/hackathons/${id}/register`, token, { method: "DELETE" });
}

export function createHackathon(
  token: string,
  payload: CreateHackathonPayload,
): Promise<HackathonDto> {
  return request<HackathonDto>("/hackathons", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
