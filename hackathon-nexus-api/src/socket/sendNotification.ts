import { Server } from "socket.io";
import { AppDataSource } from "../data-source";
import { Notification } from "../entities/Notification";
import { User } from "../entities/User";
import { AppNotification } from "./notifications";
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "./types";

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export async function sendNotification(
  io: IoServer,
  recipientId: string,
  payload: AppNotification,
): Promise<void> {
  const repo = AppDataSource.getRepository(Notification);

  const notification = repo.create({
    recipient: { id: recipientId } as User,
    payload,
    read: false,
  });

  await repo.save(notification);

  io.to(`user:${recipientId}`).emit("notification", payload);
}
