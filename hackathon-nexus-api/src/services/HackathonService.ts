import { AppDataSource } from "../data-source";
import { CreateHackathonDto, ListHackathonsQueryDto, UpdateHackathonDto } from "../dto/hackathon.dto";
import { HackathonDto, HackathonsPageDto } from "../dto/response.dto";
import { Hackathon } from "../entities/Hackathon";
import { User } from "../entities/User";

function toHackathonDto(h: Hackathon): HackathonDto {
  const dto = new HackathonDto();
  dto.id = h.id;
  dto.createdById = h.createdBy.id;
  dto.title = h.title;
  dto.description = h.description;
  dto.topic = h.topic;
  dto.startDate = h.startDate;
  dto.durationHours = h.durationHours;
  dto.maxTeamSize = h.maxTeamSize;
  dto.imageUrl = h.imageUrl;
  dto.createdAt = h.createdAt;
  dto.updatedAt = h.updatedAt;
  return dto;
}

export class HackathonService {
  private readonly repo = AppDataSource.getRepository(Hackathon);

  async list(query: ListHackathonsQueryDto): Promise<HackathonsPageDto> {
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
      qb.andWhere(
        "hackathon.startDate + (hackathon.durationHours * interval '1 hour') > :now",
        { now },
      );
    }

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data: rows.map(toHackathonDto), total, page, limit };
  }

  async create(dto: CreateHackathonDto, admin: User): Promise<HackathonDto> {
    const hackathon = this.repo.create({
      title: dto.title,
      description: dto.description,
      topic: dto.topic,
      startDate: dto.startDate,
      durationHours: dto.durationHours,
      maxTeamSize: dto.maxTeamSize,
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

    const saved = await this.repo.save(hackathon);
    return toHackathonDto(saved);
  }
}
