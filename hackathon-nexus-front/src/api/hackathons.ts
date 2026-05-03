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

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function listHackathons(token: string, topic?: HackathonTopic): Promise<HackathonDto[]> {
  const url = new URL(`${API_BASE}/hackathons`);
  if (topic) url.searchParams.set('topic', topic);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<HackathonDto[]>;
}
