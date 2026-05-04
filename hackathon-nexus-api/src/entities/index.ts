import { ChatRoom } from "./ChatRoom";
import { Hackathon } from "./Hackathon";
import { Message } from "./Message";
import { Notification } from "./Notification";
import { Participant } from "./Participant";
import { Team } from "./Team";
import { TeamRequest } from "./TeamRequest";
import { User } from "./User";

export const typeormEntities = [
  User,
  Participant,
  Hackathon,
  Team,
  TeamRequest,
  Notification,
  ChatRoom,
  Message,
];
