import { AppDataSource } from "../data-source";
import {
  CreateHackathonDto,
  ListHackathonsQueryDto,
  UpdateHackathonDto,
} from "../dto/hackathon.dto";
import { HackathonDto, HackathonsPageDto } from "../dto/response.dto";
import { Hackathon } from "../entities/Hackathon";
import { Participant } from "../entities/Participant";
import { User } from "../entities/User";
import { UserRole } from "../models/enums";

interface HackathonComputedFields {
  participantCount: number;
  isRegistered: boolean;
}

function toHackathonDto(
  h: Hackathon,
  { participantCount, isRegistered }: HackathonComputedFields = {
    participantCount: 0,
    isRegistered: false,
  },
): HackathonDto {
  const dto = new HackathonDto();
  dto.id = h.id;
  dto.createdById = h.createdBy.id;
  dto.title = h.title;
  dto.description = h.description;
  dto.topic = h.topic;
  dto.startDate = h.startDate;
  dto.durationHours = h.durationHours;
  dto.maxTeamSize = h.maxTeamSize;
  dto.maxParticipants = h.maxParticipants;
  dto.participantCount = participantCount;
  dto.registrationFull = h.maxParticipants != null && participantCount >= h.maxParticipants;
  dto.isRegistered = isRegistered;
  dto.imageUrl = h.imageUrl;
  dto.createdAt = h.createdAt;
  dto.updatedAt = h.updatedAt;
  return dto;
}

export class HackathonService {
  private readonly repo = AppDataSource.getRepository(Hackathon);
  private readonly participantRepo = AppDataSource.getRepository(Participant);

  /** Resolve the current user's participant profile, or null for admins. */
  private async resolveParticipantId(user: User): Promise<string | null> {
    if (user.role !== UserRole.PARTICIPANT) return null;
    const p = await this.participantRepo.findOne({ where: { user: { id: user.id } } });
    return p?.id ?? null;
  }

  /** Fetch registration counts and user's registrations for a list of hackathon IDs. */
  private async loadRegistrationData(
    hackathonIds: string[],
    participantId: string | null,
  ): Promise<{ countMap: Map<string, number>; registeredSet: Set<string> }> {
    if (hackathonIds.length === 0) {
      return { countMap: new Map(), registeredSet: new Set() };
    }

    const counts: { hackathonId: string; count: string }[] =
      await AppDataSource.createQueryBuilder()
        .select("hr.hackathonId", "hackathonId")
        .addSelect("COUNT(*)", "count")
        .from("hackathon_registrations", "hr")
        .where("hr.hackathonId IN (:...ids)", { ids: hackathonIds })
        .groupBy("hr.hackathonId")
        .getRawMany();

    const countMap = new Map(counts.map((c) => [c.hackathonId, parseInt(c.count, 10)]));

    let registeredSet = new Set<string>();
    if (participantId) {
      const registered: { hackathonId: string }[] = await AppDataSource.createQueryBuilder()
        .select("hr.hackathonId", "hackathonId")
        .from("hackathon_registrations", "hr")
        .where("hr.hackathonId IN (:...ids)", { ids: hackathonIds })
        .andWhere("hr.participantId = :pid", { pid: participantId })
        .getRawMany();
      registeredSet = new Set(registered.map((r) => r.hackathonId));
    }

    return { countMap, registeredSet };
  }

  async list(query: ListHackathonsQueryDto, user: User): Promise<HackathonsPageDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const now = new Date();

    const qb = this.repo
      .createQueryBuilder("hackathon")
      .leftJoinAndSelect("hackathon.createdBy", "createdBy")
      .orderBy("hackathon.startDate", "ASC");

    if (query.topic) {
      qb.andWhere("hackathon.topic = :topic", { topic: query.topic });
    }

    if (query.search) {
      qb.andWhere("hackathon.title ILIKE :search", { search: `%${query.search}%` });
    }

    if (query.notStarted) {
      qb.andWhere("hackathon.startDate > :now", { now });
    }

    if (query.notEnded) {
      // ended = startDate + durationHours has passed
      qb.andWhere("hackathon.startDate + (hackathon.durationHours * interval '1 hour') > :now", {
        now,
      });
    }

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const participantId = await this.resolveParticipantId(user);
    const { countMap, registeredSet } = await this.loadRegistrationData(
      rows.map((h) => h.id),
      participantId,
    );

    return {
      data: rows.map((h) =>
        toHackathonDto(h, {
          participantCount: countMap.get(h.id) ?? 0,
          isRegistered: registeredSet.has(h.id),
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async getOne(id: string, user: User): Promise<HackathonDto> {
    const hackathon = await this.repo.findOne({
      where: { id },
      relations: ["createdBy"],
    });
    if (!hackathon) {
      const err: any = new Error("Hackathon not found");
      err.httpCode = 404;
      throw err;
    }

    const participantId = await this.resolveParticipantId(user);
    const { countMap, registeredSet } = await this.loadRegistrationData([id], participantId);

    return toHackathonDto(hackathon, {
      participantCount: countMap.get(id) ?? 0,
      isRegistered: registeredSet.has(id),
    });
  }

  async register(id: string, user: User): Promise<HackathonDto> {
    if (user.role !== UserRole.PARTICIPANT) {
      const err: any = new Error("Only participants can register for hackathons");
      err.httpCode = 403;
      throw err;
    }

    const hackathon = await this.repo.findOne({ where: { id }, relations: ["createdBy"] });
    if (!hackathon) {
      const err: any = new Error("Hackathon not found");
      err.httpCode = 404;
      throw err;
    }

    const participant = await this.participantRepo.findOne({ where: { user: { id: user.id } } });
    if (!participant) {
      const err: any = new Error("Participant profile not found");
      err.httpCode = 422;
      throw err;
    }

    // Check if already registered
    const existing: { count: string }[] = await AppDataSource.createQueryBuilder()
      .select("COUNT(*)", "count")
      .from("hackathon_registrations", "hr")
      .where("hr.hackathonId = :hid", { hid: id })
      .andWhere("hr.participantId = :pid", { pid: participant.id })
      .getRawMany();
    if (parseInt(existing[0]?.count ?? "0", 10) > 0) {
      const err: any = new Error("Already registered for this hackathon");
      err.httpCode = 409;
      throw err;
    }

    // Check capacity
    if (hackathon.maxParticipants != null) {
      const countRows: { count: string }[] = await AppDataSource.createQueryBuilder()
        .select("COUNT(*)", "count")
        .from("hackathon_registrations", "hr")
        .where("hr.hackathonId = :hid", { hid: id })
        .getRawMany();
      const current = parseInt(countRows[0]?.count ?? "0", 10);
      if (current >= hackathon.maxParticipants) {
        const err: any = new Error("Registration is full");
        err.httpCode = 409;
        throw err;
      }
    }

    await AppDataSource.createQueryBuilder()
      .insert()
      .into("hackathon_registrations")
      .values({ hackathonId: id, participantId: participant.id })
      .execute();

    return this.getOne(id, user);
  }

  async unregister(id: string, user: User): Promise<void> {
    if (user.role !== UserRole.PARTICIPANT) {
      const err: any = new Error("Only participants can unregister");
      err.httpCode = 403;
      throw err;
    }

    const participant = await this.participantRepo.findOne({ where: { user: { id: user.id } } });
    if (!participant) {
      const err: any = new Error("Participant profile not found");
      err.httpCode = 422;
      throw err;
    }

    await AppDataSource.createQueryBuilder()
      .delete()
      .from("hackathon_registrations")
      .where("hackathonId = :hid", { hid: id })
      .andWhere("participantId = :pid", { pid: participant.id })
      .execute();
  }

  async create(dto: CreateHackathonDto, admin: User): Promise<HackathonDto> {
    const hackathon = this.repo.create({
      title: dto.title,
      description: dto.description,
      topic: dto.topic,
      startDate: dto.startDate,
      durationHours: dto.durationHours,
      maxTeamSize: dto.maxTeamSize,
      maxParticipants: dto.maxParticipants,
      createdBy: admin,
    });

    const saved = await this.repo.save(hackathon);
    return toHackathonDto(saved);
  }

  async update(id: string, dto: UpdateHackathonDto, admin: User): Promise<HackathonDto> {
    const hackathon = await this.repo.findOne({
      where: { id },
      relations: ["createdBy"],
    });

    if (!hackathon) {
      const err: any = new Error("Hackathon not found");
      err.httpCode = 404;
      throw err;
    }

    if (hackathon.createdBy.id !== admin.id) {
      const err: any = new Error("Forbidden");
      err.httpCode = 403;
      throw err;
    }

    if (dto.title !== undefined) hackathon.title = dto.title;
    if (dto.description !== undefined) hackathon.description = dto.description;
    if (dto.topic !== undefined) hackathon.topic = dto.topic;
    if (dto.startDate !== undefined) hackathon.startDate = dto.startDate;
    if (dto.durationHours !== undefined) hackathon.durationHours = dto.durationHours;
    if (dto.maxParticipants !== undefined) hackathon.maxParticipants = dto.maxParticipants;

    const saved = await this.repo.save(hackathon);
    return toHackathonDto(saved);
  }
}
