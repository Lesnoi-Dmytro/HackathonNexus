// Mirror of the backend AppNotification discriminated union (payload shapes only)

export interface JoinRequestNotification {
  type: "team:join-request";
  requestId: string;
  teamId: string;
  teamName: string;
  participant: {
    id: string;
    firstName: string;
    lastName: string;
    position?: string;
    skills: string[];
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

export function notificationText(
  n: AppNotification,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  switch (n.type) {
    case "team:join-request":
      return t("notifications.joinRequest", {
        firstName: n.participant.firstName,
        lastName: n.participant.lastName,
        teamName: n.teamName,
      });
    case "team:join-request:accepted":
      return t("notifications.joinRequestAccepted", { teamName: n.teamName });
    case "team:join-request:rejected":
      return t("notifications.joinRequestRejected", { teamName: n.teamName });
    case "team:invite":
      return t("notifications.invite", {
        firstName: n.leader.firstName,
        lastName: n.leader.lastName,
        teamName: n.teamName,
      });
    case "team:invite:accepted":
      return t("notifications.inviteAccepted", {
        firstName: n.participant.firstName,
        lastName: n.participant.lastName,
      });
    case "team:invite:rejected":
      return t("notifications.inviteRejected", {
        firstName: n.participant.firstName,
        lastName: n.participant.lastName,
      });
  }
}
