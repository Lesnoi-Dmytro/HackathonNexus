import { AppDataSource } from "../data-source";
import { CreateHackathonDto, UpdateHackathonDto } from "../dto/hackathon.dto";
import { HackathonDto } from "../dto/response.dto";
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
