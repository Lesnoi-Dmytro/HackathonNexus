import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { AppDataSource } from "../data-source";
import { ChatRoom } from "../entities/ChatRoom";
import { Participant } from "../entities/Participant";
import { User } from "../entities/User";
import { UserRole } from "../models/enums";
import {
  AuthenticatedSocket,
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types";

interface JwtPayload {
  sub: string;
  role: UserRole;
}

export function createSocketServer(
  httpServer: ReturnType<typeof import("http").createServer>,
): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: { origin: "*" },
      path: "/ws",
    },
  );

  // ── JWT authentication middleware ─────────────────────────────────────────
  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers?.authorization as string | undefined)?.replace("Bearer ", "");

    if (!token) return next(new Error("Authentication required"));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const user = await AppDataSource.getRepository(User).findOneBy({ id: payload.sub });
      if (!user) return next(new Error("User not found"));

      const participant =
        user.role === UserRole.PARTICIPANT
          ? await AppDataSource.getRepository(Participant).findOne({
              where: { user: { id: user.id } },
            })
          : null;

      (socket as AuthenticatedSocket).user = user;
      (socket as AuthenticatedSocket).participant = participant;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  // ── Connection ────────────────────────────────────────────────────────────
  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const { user, participant } = socket;

    // Each user has a personal room for targeted notifications
    socket.join(`user:${user.id}`);

    // Rejoin all chat rooms the user belongs to
    void AppDataSource.getRepository(ChatRoom)
      .createQueryBuilder("room")
      .innerJoin("room.members", "member")
      .select(["room.id"])
      .where("member.id = :userId", { userId: user.id })
      .getMany()
      .then((rooms) => rooms.forEach((r) => socket.join(`chat:${r.id}`)));

    if (process.env.NODE_ENV !== "production") {
      console.log(`[WS] connected: ${user.email} (${user.role})`);
    }

    registerTeamHandlers(io, socket);
    registerChatHandlers(io, socket);

    socket.on("disconnect", () => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[WS] disconnected: ${user.email}`);
      }
    });
  });

  return io;
}

// Import here to avoid circular reference issues
import { registerChatHandlers } from "./handlers/chatHandler";
import { registerTeamHandlers } from "./handlers/teamHandler";
