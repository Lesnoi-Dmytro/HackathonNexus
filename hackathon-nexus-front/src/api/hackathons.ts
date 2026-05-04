export type HackathonTopic =
  | 'AI / Machine Learning'
  | 'AR / VR'
  | 'Blockchain / Web3'
  | 'Cybersecurity'
  | 'FinTech'
  | 'Game Development'
  | 'HealthTech'
  | 'IoT & Embedded'
  | 'Mobile Development'
  | 'Web Development';

export const ALL_TOPICS: HackathonTopic[] = [
  'AI / Machine Learning',
  'AR / VR',
  'Blockchain / Web3',
  'Cybersecurity',
  'FinTech',
  'Game Development',
  'HealthTech',
  'IoT & Embedded',
  'Mobile Development',
  'Web Development',
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
  page?: number;
  limit?: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function listHackathons(
  token: string,
  params: ListHackathonsParams = {},
): Promise<HackathonsPage> {
  const url = new URL(`${API_BASE}/hackathons`);
  if (params.topic) url.searchParams.set('topic', params.topic);
  if (params.search) url.searchParams.set('search', params.search);
  if (params.notStarted) url.searchParams.set('notStarted', 'true');
  if (params.notEnded) url.searchParams.set('notEnded', 'true');
  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.limit) url.searchParams.set('limit', String(params.limit));

  return request<HackathonsPage>(url.pathname + url.search, token);
}

export function getHackathon(token: string, id: string): Promise<HackathonDto> {
  return request<HackathonDto>(`/hackathons/${id}`, token);
}

export function registerForHackathon(token: string, id: string): Promise<HackathonDto> {
  return request<HackathonDto>(`/hackathons/${id}/register`, token, { method: 'POST' });
}

export function unregisterFromHackathon(token: string, id: string): Promise<void> {
  return request<void>(`/hackathons/${id}/register`, token, { method: 'DELETE' });
}
