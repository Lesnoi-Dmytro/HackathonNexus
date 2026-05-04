const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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

export async function getChatRooms(token: string): Promise<ChatRoomDto[]> {
  const res = await fetch(`${BASE}/api/chat/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load chat rooms");
  return res.json();
}

export async function getOrCreateTeamRoom(token: string, teamId: string): Promise<ChatRoomDto> {
  const res = await fetch(`${BASE}/api/chat/rooms/team/${teamId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to open team chat");
  return res.json();
}

export async function getOrCreateDirectRoom(
  token: string,
  targetUserId: string,
): Promise<ChatRoomDto> {
  const res = await fetch(`${BASE}/api/chat/rooms/direct`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ targetUserId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? "Failed to open DM");
  }
  return res.json();
}

export async function getMessages(
  token: string,
  roomId: string,
  params: { before?: string; limit?: number } = {},
): Promise<MessageDto[]> {
  const qs = new URLSearchParams();
  if (params.before) qs.set("before", params.before);
  if (params.limit != null) qs.set("limit", String(params.limit));
  const res = await fetch(`${BASE}/api/chat/rooms/${roomId}/messages?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
}
