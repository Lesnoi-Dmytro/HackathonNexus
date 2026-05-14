export interface JoinRequestNotification {
  type: "team:join-request";
  requestId: string;
  teamId: string;
  teamName: string;
  hackathonId: string;
  participant: {
    id: string;
    userId: string;
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
  hackathonId: string;
}

export interface JoinRequestRejectedNotification {
  type: "team:join-request:rejected";
  requestId: string;
  teamId: string;
  teamName: string;
  hackathonId: string;
}

export interface InviteNotification {
  type: "team:invite";
  requestId: string;
  teamId: string;
  teamName: string;
  hackathonId: string;
  leader: { id: string; userId: string; firstName: string; lastName: string };
}

export interface InviteAcceptedNotification {
  type: "team:invite:accepted";
  requestId: string;
  teamId: string;
  hackathonId: string;
  participant: { id: string; firstName: string; lastName: string };
}

export interface InviteRejectedNotification {
  type: "team:invite:rejected";
  requestId: string;
  teamId: string;
  hackathonId: string;
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

/** Returns a secondary entity link shown inline in the notification (profile or team page). */
export function notificationEntityLink(n: AppNotification): { label: string; url: string } | null {
  switch (n.type) {
    case "team:join-request":
      return {
        label: `${n.participant.firstName} ${n.participant.lastName}`,
        url: `/users/${n.participant.userId}`,
      };
    case "team:invite":
      return {
        label: n.teamName,
        url: `/hackathons/${n.hackathonId}/team`,
      };
    default:
      return null;
  }
}
export function notificationLink(n: AppNotification): string | null {
  switch (n.type) {
    // Leader gets this → go to team management to handle the pending request
    case "team:join-request":
      return `/hackathons/${n.hackathonId}/team`;
    // Participant gets this → go to team management to accept/reject the invite
    case "team:invite":
      return `/hackathons/${n.hackathonId}/team`;
    // Informational notifications — no navigation needed
    default:
      return null;
  }
}
