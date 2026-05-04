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

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<HackathonsPage>;
}
