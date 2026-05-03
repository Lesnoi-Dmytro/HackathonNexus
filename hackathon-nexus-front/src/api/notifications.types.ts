// Mirror of the backend AppNotification discriminated union (payload shapes only)

export interface JoinRequestNotification {
  type: 'team:join-request';
  requestId: string;
  teamId: string;
  teamName: string;
  participant: { id: string; firstName: string; lastName: string; position?: string; skills: string[] };
}

export interface JoinRequestAcceptedNotification {
  type: 'team:join-request:accepted';
  requestId: string;
  teamId: string;
  teamName: string;
}

export interface JoinRequestRejectedNotification {
  type: 'team:join-request:rejected';
  requestId: string;
  teamId: string;
  teamName: string;
}

export interface InviteNotification {
  type: 'team:invite';
  requestId: string;
  teamId: string;
  teamName: string;
  leader: { id: string; firstName: string; lastName: string };
}

export interface InviteAcceptedNotification {
  type: 'team:invite:accepted';
  requestId: string;
  teamId: string;
  participant: { id: string; firstName: string; lastName: string };
}

export interface InviteRejectedNotification {
  type: 'team:invite:rejected';
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

export function notificationText(n: AppNotification): string {
  switch (n.type) {
    case 'team:join-request':
      return `${n.participant.firstName} ${n.participant.lastName} wants to join team "${n.teamName}"`;
    case 'team:join-request:accepted':
      return `Your request to join "${n.teamName}" was accepted`;
    case 'team:join-request:rejected':
      return `Your request to join "${n.teamName}" was rejected`;
    case 'team:invite':
      return `${n.leader.firstName} ${n.leader.lastName} invited you to team "${n.teamName}"`;
    case 'team:invite:accepted':
      return `${n.participant.firstName} ${n.participant.lastName} accepted your invite`;
    case 'team:invite:rejected':
      return `${n.participant.firstName} ${n.participant.lastName} declined your invite`;
  }
}
