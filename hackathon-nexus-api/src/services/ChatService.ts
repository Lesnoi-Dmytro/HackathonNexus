import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { ChatRoom } from "../entities/ChatRoom";
import { Message } from "../entities/Message";
import { Team } from "../entities/Team";
import { User } from "../entities/User";
import { ChatRoomType } from "../models/enums";

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface ChatMemberDto {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ChatRoomDto {
  id: string;
  type: ChatRoomType;
  teamId?: string;
  teamName?: string;
  members: ChatMemberDto[];
  createdAt: string;
}

export interface MessageDto {
  id: string;
  chatRoomId: string;
  sender: ChatMemberDto;
  content: string;
  createdAt: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ChatService {
  private readonly roomRepo = AppDataSource.getRepository(ChatRoom);
  private readonly messageRepo = AppDataSource.getRepository(Message);
  private readonly teamRepo = AppDataSource.getRepository(Team);

  // ── Room access helpers ───────────────────────────────────────────────────

  async isRoomMember(roomId: string, userId: string): Promise<boolean> {
    const count = await this.roomRepo
      .createQueryBuilder("room")
      .innerJoin("room.members", "member")
      .where("room.id = :roomId", { roomId })
      .andWhere("member.id = :userId", { userId })
      .getCount();
    return count > 0;
  }

  // ── Get user's rooms ──────────────────────────────────────────────────────

  async getUserRooms(userId: string): Promise<ChatRoomDto[]> {
    const rooms = await this.roomRepo
      .createQueryBuilder("room")
      .innerJoin("room.members", "me")
      .innerJoinAndSelect("room.members", "member")
      .where("me.id = :userId", { userId })
      .orderBy("room.createdAt", "ASC")
      .getMany();

    const teamRooms = rooms.filter((r) => r.teamId);
    let nameMap = new Map<string, string>();
    if (teamRooms.length > 0) {
      const teamIds = teamRooms.map((r) => r.teamId!);
      const teams = await this.teamRepo.find({
        where: { id: In(teamIds) },
      });
      nameMap = new Map(teams.map((t) => [t.id, t.name]));
    }

    return rooms.map((r) =>
      this.toRoomDto(r, r.teamId ? nameMap.get(r.teamId) : undefined),
    );
  }

  // ── Get or create TEAM room ───────────────────────────────────────────────

  async getOrCreateTeamRoom(teamId: string, userId: string): Promise<ChatRoomDto> {
    // Verify caller is a member/leader of the team
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ["leader", "leader.user", "members", "members.user"],
    });
    if (!team) throw Object.assign(new Error("Team not found"), { status: 404 });

    const isTeamMember =
      team.leader.user.id === userId || team.members.some((m) => m.user.id === userId);
    if (!isTeamMember) throw Object.assign(new Error("Not a team member"), { status: 403 });

    // Upsert: one TEAM room per team
    let room = await this.roomRepo.findOne({
      where: { type: ChatRoomType.TEAM, teamId },
      relations: ["members"],
    });

    if (!room) {
      // Collect all team user IDs and load User entities
      const userIds = [team.leader.user.id, ...team.members.map((m) => m.user.id)];
      const users = await AppDataSource.getRepository(User).findByIds(userIds);
      room = this.roomRepo.create({ type: ChatRoomType.TEAM, teamId, members: users });
      room = await this.roomRepo.save(room);
      room = (await this.roomRepo.findOne({
        where: { id: room.id },
        relations: ["members"],
      }))!;
    }

    return this.toRoomDto(room, team.name);
  }

  // ── Get or create DIRECT room ─────────────────────────────────────────────

  async getOrCreateDirectRoom(userId: string, targetUserId: string): Promise<ChatRoomDto> {
    if (userId === targetUserId) {
      throw Object.assign(new Error("Cannot create a DM with yourself"), { status: 400 });
    }

    // Look for an existing DIRECT room that contains exactly these two users
    const existing = await this.roomRepo
      .createQueryBuilder("room")
      .innerJoin("room.members", "m1")
      .innerJoin("room.members", "m2")
      .innerJoinAndSelect("room.members", "member")
      .where("room.type = :type", { type: ChatRoomType.DIRECT })
      .andWhere("m1.id = :userId", { userId })
      .andWhere("m2.id = :targetUserId", { targetUserId })
      .getOne();

    if (existing) return this.toRoomDto(existing);

    const userRepo = AppDataSource.getRepository(User);
    const [user, target] = await Promise.all([
      userRepo.findOneBy({ id: userId }),
      userRepo.findOneBy({ id: targetUserId }),
    ]);
    if (!user || !target) {
      throw Object.assign(new Error("User not found"), { status: 404 });
    }

    let room = this.roomRepo.create({ type: ChatRoomType.DIRECT, members: [user, target] });
    room = await this.roomRepo.save(room);
    room = (await this.roomRepo.findOne({
      where: { id: room.id },
      relations: ["members"],
    }))!;

    return this.toRoomDto(room);
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async getMessages(roomId: string, before?: string, limit = 50): Promise<MessageDto[]> {
    const take = Math.min(Math.max(limit, 1), 100);

    const qb = this.messageRepo
      .createQueryBuilder("msg")
      .innerJoin("msg.sender", "sender")
      .select([
        "msg.id",
        "msg.chatRoomId",
        "msg.content",
        "msg.createdAt",
        "sender.id",
        "sender.firstName",
        "sender.lastName",
      ])
      .where("msg.chatRoomId = :roomId", { roomId })
      .orderBy("msg.createdAt", "DESC")
      .limit(take);

    if (before) {
      qb.andWhere("msg.createdAt < :before", { before: new Date(before) });
    }

    const rows = await qb.getMany();
    return rows.map((m) => this.toMessageDto(m));
  }

  async saveMessage(roomId: string, sender: User, content: string): Promise<MessageDto> {
    const msg = this.messageRepo.create({
      chatRoomId: roomId,
      chatRoom: { id: roomId } as ChatRoom,
      sender,
      senderId: sender.id,
      content,
    });
    const saved = await this.messageRepo.save(msg);
    return {
      id: saved.id,
      chatRoomId: saved.chatRoomId,
      sender: { id: sender.id, firstName: sender.firstName, lastName: sender.lastName },
      content: saved.content,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private toRoomDto(room: ChatRoom, teamName?: string): ChatRoomDto {
    return {
      id: room.id,
      type: room.type,
      ...(room.teamId ? { teamId: room.teamId } : {}),
      ...(teamName ? { teamName } : {}),
      members: (room.members ?? []).map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
      })),
      createdAt: room.createdAt.toISOString(),
    };
  }

  private toMessageDto(m: Message & { sender: User }): MessageDto {
    return {
      id: m.id,
      chatRoomId: m.chatRoomId,
      sender: { id: m.sender.id, firstName: m.sender.firstName, lastName: m.sender.lastName },
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    };
  }
}
