import { Socket } from "socket.io";
import { Participant } from "../entities/Participant";
import { User } from "../entities/User";
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
}

export interface ServerToClientEvents {
  notification: (payload: AppNotification) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  userId: string;
}
