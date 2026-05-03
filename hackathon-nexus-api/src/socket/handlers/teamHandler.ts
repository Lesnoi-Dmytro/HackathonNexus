import { Server } from "socket.io";
import { AppDataSource } from "../../data-source";
import { Participant } from "../../entities/Participant";
import { Team } from "../../entities/Team";
import { TeamRequest } from "../../entities/TeamRequest";
import { TeamRequestStatus, TeamRequestType, UserRole } from "../../models/enums";
import { sendNotification } from "../sendNotification";
import {
  AuthenticatedSocket,
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types";

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerTeamHandlers(io: IoServer, socket: AuthenticatedSocket): void {
  const teamRepo = AppDataSource.getRepository(Team);
  const participantRepo = AppDataSource.getRepository(Participant);
  const requestRepo = AppDataSource.getRepository(TeamRequest);

  socket.on("team:request-join", async ({ teamId }, ack) => {
    try {
      if (socket.user.role !== UserRole.PARTICIPANT) {
        return ack("Only participants can request to join a team");
      }

      const participant = socket.participant;
      if (!participant) return ack("Participant profile not found");

      const team = await teamRepo.findOne({
        where: { id: teamId },
        relations: ["hackathon", "leader", "leader.user", "members"],
      });
      if (!team) return ack("Team not found");

      if (team.members.length >= team.hackathon.maxTeamSize) {
        return ack("Team is already full");
      }

      const alreadyMember = team.members.some((m) => m.id === participant.id);
      if (alreadyMember) return ack("Already a member of this team");

      const existing = await requestRepo.findOne({
        where: {
          team: { id: teamId },
          participant: { id: participant.id },
          type: TeamRequestType.JOIN_REQUEST,
          status: TeamRequestStatus.PENDING,
        },
      });
      if (existing) return ack("Join request already pending");

      const request = requestRepo.create({
        type: TeamRequestType.JOIN_REQUEST,
        status: TeamRequestStatus.PENDING,
        team,
        participant,
      });
      const saved = await requestRepo.save(request);

      await sendNotification(io, team.leader.user.id, {
        type: "team:join-request",
        requestId: saved.id,
        teamId: team.id,
        teamName: team.name,
        participant: {
          id: participant.id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          position: participant.position,
          skills: participant.skills,
        },
      });

      ack(null);
    } catch (err) {
      console.error("[WS] team:request-join error", err);
      ack("Internal server error");
    }
  });

  socket.on("team:request-join:respond", async ({ requestId, accept }, ack) => {
    try {
      const request = await requestRepo.findOne({
        where: { id: requestId, type: TeamRequestType.JOIN_REQUEST },
        relations: [
          "team",
          "team.leader",
          "team.leader.user",
          "team.members",
          "participant",
          "participant.user",
        ],
      });

      if (!request) return ack("Request not found");
      if (request.status !== TeamRequestStatus.PENDING) return ack("Request already resolved");
      if (request.team.leader.user.id !== socket.user.id) {
        return ack("Only the team leader can respond to join requests");
      }

      request.status = accept ? TeamRequestStatus.ACCEPTED : TeamRequestStatus.REJECTED;
      await requestRepo.save(request);

      if (accept) {
        const team = await teamRepo.findOne({
          where: { id: request.team.id },
          relations: ["hackathon", "members"],
        });
        if (team && team.members.length < team.hackathon.maxTeamSize) {
          team.members.push(request.participant);
          await teamRepo.save(team);

          io.in(`user:${request.participant.user.id}`).socketsJoin(`team:${team.id}`);
        }

        await sendNotification(io, request.participant.user.id, {
          type: "team:join-request:accepted",
          requestId: request.id,
          teamId: request.team.id,
          teamName: request.team.name,
        });
      } else {
        await sendNotification(io, request.participant.user.id, {
          type: "team:join-request:rejected",
          requestId: request.id,
          teamId: request.team.id,
          teamName: request.team.name,
        });
      }

      ack(null);
    } catch (err) {
      console.error("[WS] team:request-join:respond error", err);
      ack("Internal server error");
    }
  });

  socket.on("team:invite", async ({ teamId, participantId }, ack) => {
    try {
      const team = await teamRepo.findOne({
        where: { id: teamId },
        relations: ["hackathon", "leader", "leader.user", "members"],
      });
      if (!team) return ack("Team not found");

      if (team.leader.user.id !== socket.user.id) {
        return ack("Only the team leader can send invites");
      }

      if (team.members.length >= team.hackathon.maxTeamSize) {
        return ack("Team is already full");
      }

      const invitee = await participantRepo.findOne({
        where: { id: participantId },
        relations: ["user"],
      });
      if (!invitee) return ack("Participant not found");

      const alreadyMember = team.members.some((m) => m.id === invitee.id);
      if (alreadyMember) return ack("Participant is already a team member");

      const existing = await requestRepo.findOne({
        where: {
          team: { id: teamId },
          participant: { id: invitee.id },
          type: TeamRequestType.INVITE,
          status: TeamRequestStatus.PENDING,
        },
      });
      if (existing) return ack("Invite already pending");

      const request = requestRepo.create({
        type: TeamRequestType.INVITE,
        status: TeamRequestStatus.PENDING,
        team,
        participant: invitee,
      });
      const saved = await requestRepo.save(request);

      await sendNotification(io, invitee.user.id, {
        type: "team:invite",
        requestId: saved.id,
        teamId: team.id,
        teamName: team.name,
        leader: {
          id: socket.participant?.id ?? "",
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
        },
      });

      ack(null);
    } catch (err) {
      console.error("[WS] team:invite error", err);
      ack("Internal server error");
    }
  });

  socket.on("team:invite:respond", async ({ requestId, accept }, ack) => {
    try {
      if (socket.user.role !== UserRole.PARTICIPANT) {
        return ack("Only participants can respond to invites");
      }

      const participant = socket.participant;
      if (!participant) return ack("Participant profile not found");

      const request = await requestRepo.findOne({
        where: { id: requestId, type: TeamRequestType.INVITE },
        relations: ["team", "team.leader", "team.leader.user", "team.members", "participant"],
      });

      if (!request) return ack("Invite not found");
      if (request.status !== TeamRequestStatus.PENDING) return ack("Invite already resolved");
      if (request.participant.id !== participant.id) {
        return ack("This invite is not addressed to you");
      }

      request.status = accept ? TeamRequestStatus.ACCEPTED : TeamRequestStatus.REJECTED;
      await requestRepo.save(request);

      if (accept) {
        const team = await teamRepo.findOne({
          where: { id: request.team.id },
          relations: ["hackathon", "members"],
        });
        if (team && team.members.length < team.hackathon.maxTeamSize) {
          team.members.push(participant);
          await teamRepo.save(team);

          socket.join(`team:${team.id}`);
        }

        await sendNotification(io, request.team.leader.user.id, {
          type: "team:invite:accepted",
          requestId: request.id,
          teamId: request.team.id,
          participant: {
            id: participant.id,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
          },
        });
      } else {
        await sendNotification(io, request.team.leader.user.id, {
          type: "team:invite:rejected",
          requestId: request.id,
          teamId: request.team.id,
          participant: {
            id: participant.id,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
          },
        });
      }

      ack(null);
    } catch (err) {
      console.error("[WS] team:invite:respond error", err);
      ack("Internal server error");
    }
  });
}
