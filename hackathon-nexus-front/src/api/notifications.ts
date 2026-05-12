import type { AppNotification } from "./notifications.types";

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

import { request } from "./client";

export function getNotifications(
  token: string,
  params?: { read?: boolean; page?: number; limit?: number },
): Promise<NotificationsPage> {
  const qs = new URLSearchParams();
  if (params?.read !== undefined) qs.set("read", String(params.read));
  if (params?.page !== undefined) qs.set("page", String(params.page));
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs}` : "";
  return request<NotificationsPage>(`/notifications${query}`, token);
}

export function markNotificationRead(token: string, id: string): Promise<NotificationDto> {
  return request<NotificationDto>(`/notifications/${id}/read`, token, { method: "PATCH" });
}
