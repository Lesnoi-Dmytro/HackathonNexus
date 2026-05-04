import { io, Socket } from "socket.io-client";
import type { AppNotification } from "../api/notifications.types";

export interface ServerToClientEvents {
  notification: (payload: AppNotification) => void;
}

export interface ClientToServerEvents {
  "team:request-join": (payload: { teamId: string }, ack: (err: string | null) => void) => void;
  "team:request-join:respond": (
    payload: { requestId: string; accept: boolean },
    ack: (err: string | null) => void,
  ) => void;
  "team:invite": (
    payload: { teamId: string; participantId: string },
    ack: (err: string | null) => void,
  ) => void;
  "team:invite:respond": (
    payload: { requestId: string; accept: boolean },
    ack: (err: string | null) => void,
  ) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

let socket: AppSocket | null = null;

export function getSocket(): AppSocket | null {
  return socket;
}

export function connectSocket(token: string): AppSocket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    path: "/ws",
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
  }) as AppSocket;

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
