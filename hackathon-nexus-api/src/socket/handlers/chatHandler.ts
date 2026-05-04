import { Server } from "socket.io";
import { ChatService } from "../../services/ChatService";
import {
  AuthenticatedSocket,
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types";

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerChatHandlers(io: IoServer, socket: AuthenticatedSocket): void {
  const chatService = new ChatService();

  socket.on("chat:send", async ({ roomId, content }, ack) => {
    try {
      const trimmed = content?.trim();
      if (!trimmed) return ack("Message content cannot be empty");
      if (trimmed.length > 4000) return ack("Message too long (max 4000 characters)");

      const isMember = await chatService.isRoomMember(roomId, socket.user.id);
      if (!isMember) return ack("You are not a member of this room");

      const message = await chatService.saveMessage(roomId, socket.user, trimmed);

      io.to(`chat:${roomId}`).emit("chat:message", message);

      ack(null);
    } catch (err) {
      console.error("[WS] chat:send error", err);
      ack("Internal server error");
    }
  });
}
