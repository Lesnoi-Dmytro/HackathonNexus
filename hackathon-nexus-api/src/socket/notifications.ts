import { Position, Skill } from "../models/enums";

export interface JoinRequestNotification {
  type: "team:join-request";
  requestId: string;
  teamId: string;
  teamName: string;
  participant: {
    id: string;
    firstName: string;
    lastName: string;
    position?: Position;
    skills: Skill[];
  };
}

export interface JoinRequestAcceptedNotification {
  type: "team:join-request:accepted";
  requestId: string;
  teamId: string;
  teamName: string;
}

export interface JoinRequestRejectedNotification {
  type: "team:join-request:rejected";
  requestId: string;
  teamId: string;
  teamName: string;
}

export interface InviteNotification {
  type: "team:invite";
  requestId: string;
  teamId: string;
  teamName: string;
  leader: { id: string; firstName: string; lastName: string };
}

export interface InviteAcceptedNotification {
  type: "team:invite:accepted";
  requestId: string;
  teamId: string;
  participant: { id: string; firstName: string; lastName: string };
}

export interface InviteRejectedNotification {
  type: "team:invite:rejected";
  requestId: string;
  teamId: string;
  participant: { id: string; firstName: string; lastName: string };
}

export type AppNotification =
  | JoinRequestNotification
  | JoinRequestAcceptedNotification
  | JoinRequestRejectedNotification
  | InviteNotification
  | InviteAcceptedNotification
  | InviteRejectedNotification;
