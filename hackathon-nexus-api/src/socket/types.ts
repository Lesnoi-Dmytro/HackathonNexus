import { Socket } from "socket.io";
import { Participant } from "../entities/Participant";
import { User } from "../entities/User";
import { MessageDto } from "../services/ChatService";
import { AppNotification } from "./notifications";

export interface AuthenticatedSocket extends Socket {
  user: User;
  participant: Participant | null;
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

  /** Send a new chat message to a room (team or direct). */
  "chat:send": (
    payload: { roomId: string; content: string },
    ack: (err: string | null) => void,
  ) => void;
}

export interface ServerToClientEvents {
  notification: (payload: AppNotification) => void;
  /** Broadcast a new chat message to all members in a team room. */
  "chat:message": (payload: MessageDto) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  userId: string;
}
