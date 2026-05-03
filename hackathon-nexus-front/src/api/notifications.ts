import type { AppNotification } from './notifications.types';

export interface NotificationDto {
  id: string;
  payload: AppNotification;
  read: boolean;
  createdAt: string;
}

export interface NotificationsPage {
  data: NotificationDto[];
  total: number;
  page: number;
  limit: number;
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
  return res.json() as Promise<T>;
}

export function getNotifications(
  token: string,
  params?: { read?: boolean; page?: number; limit?: number },
): Promise<NotificationsPage> {
  const url = new URL(`${API_BASE}/notifications`);
  if (params?.read !== undefined) url.searchParams.set('read', String(params.read));
  if (params?.page !== undefined) url.searchParams.set('page', String(params.page));
  if (params?.limit !== undefined) url.searchParams.set('limit', String(params.limit));
  return request<NotificationsPage>(url.pathname + url.search, token);
}

export function markNotificationRead(token: string, id: string): Promise<NotificationDto> {
  return request<NotificationDto>(`/notifications/${id}/read`, token, { method: 'PATCH' });
}
