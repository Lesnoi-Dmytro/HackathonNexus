import { request } from "./client";

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface ChatMemberDto {
  id: string;
  firstName: string;
  lastName: string;
}

export type ChatRoomType = "team" | "direct";

export interface ChatRoomDto {
  id: string;
  type: ChatRoomType;
  /** Present only for team rooms. */
  teamId?: string;
  /** Name of the team — present only for team rooms. */
  teamName?: string;
  members: ChatMemberDto[];
  createdAt: string;
}

export interface MessageDto {
  id: string;
  chatRoomId: string;
  sender: ChatMemberDto;
  content: string;
  createdAt: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export function getChatRooms(token: string): Promise<ChatRoomDto[]> {
  return request<ChatRoomDto[]>("/chat/rooms", token);
}

export function getOrCreateTeamRoom(token: string, teamId: string): Promise<ChatRoomDto> {
  return request<ChatRoomDto>(`/chat/rooms/team/${teamId}`, token, { method: "POST" });
}

export function getOrCreateDirectRoom(token: string, targetUserId: string): Promise<ChatRoomDto> {
  return request<ChatRoomDto>("/chat/rooms/direct", token, {
    method: "POST",
    body: JSON.stringify({ targetUserId }),
  });
}

export function getMessages(
  token: string,
  roomId: string,
  params: { before?: string; limit?: number } = {},
): Promise<MessageDto[]> {
  const qs = new URLSearchParams();
  if (params.before) qs.set("before", params.before);
  if (params.limit != null) qs.set("limit", String(params.limit));
  return request<MessageDto[]>(`/chat/rooms/${roomId}/messages?${qs}`, token);
}
