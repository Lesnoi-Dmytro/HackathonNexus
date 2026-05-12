import { In } from "typeorm";
import { fetchRecommendations } from "../clients/RecommendClient";
import { AppDataSource } from "../data-source";
import {
  MembersRecommendResponseDto,
  TeamDto,
  TeamMemberDto,
  TeamRequestItemDto,
  TeamRequestParticipantDto,
  TeamsRecommendResponseDto,
} from "../dto/response.dto";
import { CreateTeamDto, FindMembersQueryDto, FindTeamsQueryDto } from "../dto/team.dto";
import { Hackathon } from "../entities/Hackathon";
import { Participant } from "../entities/Participant";
import { Team } from "../entities/Team";
import { TeamRequest } from "../entities/TeamRequest";
import { User } from "../entities/User";
import { TeamRequestStatus, TeamRequestType } from "../models/enums";

function toTeamDto(team: Team): TeamDto {
  const dto = new TeamDto();
  dto.id = team.id;
  dto.name = team.name;
  dto.hackathonId = team.hackathon.id;
  dto.leaderId = team.leader.id;
  dto.members = team.members.map((p) => {
    const m = new TeamMemberDto();
    m.id = p.id;
    m.userId = p.user.id;
    m.firstName = p.user.firstName;
    m.lastName = p.user.lastName;
    m.position = p.position;
    m.skills = p.skills;
    m.yearsOfExperience = p.yearsOfExperience;
    return m;
  });
  dto.createdAt = team.createdAt;
  dto.updatedAt = team.updatedAt;
  return dto;
}

export class TeamService {
  private readonly teamRepo = AppDataSource.getRepository(Team);
  private readonly hackathonRepo = AppDataSource.getRepository(Hackathon);
  private readonly participantRepo = AppDataSource.getRepository(Participant);
  private readonly requestRepo = AppDataSource.getRepository(TeamRequest);

  private async resolveParticipant(user: User): Promise<Participant> {
    const participant = await this.participantRepo.findOne({
      where: { user: { id: user.id } },
    });
    if (!participant) {
      const err: any = new Error("Participant profile not found");
      err.httpCode = 422;
      throw err;
    }
    return participant;
  }

  async getMyTeam(hackathonId: string, user: User): Promise<TeamDto | null> {
    const participant = await this.participantRepo.findOne({ where: { user: { id: user.id } } });
    if (!participant) return null;

    const team = await this.teamRepo
      .createQueryBuilder("team")
      .leftJoinAndSelect("team.hackathon", "hackathon")
      .leftJoinAndSelect("team.leader", "leader")
      .leftJoinAndSelect("leader.user", "leaderUser")
      .leftJoinAndSelect("team.members", "member")
      .leftJoinAndSelect("member.user", "memberUser")
      .where("team.hackathonId = :hackathonId", { hackathonId })
      .andWhere((qb) => {
        const sub = qb
          .subQuery()
          .select("1")
          .from("team_members", "tm")
          .where("tm.teamId = team.id")
          .andWhere("tm.participantId = :pid", { pid: participant.id })
          .getQuery();
        return `EXISTS ${sub}`;
      })
      .getOne();

    return team ? toTeamDto(team) : null;
  }

  async create(dto: CreateTeamDto, user: User): Promise<TeamDto> {
    const hackathon = await this.hackathonRepo.findOne({ where: { id: dto.hackathonId } });
    if (!hackathon) {
      const err: any = new Error("Hackathon not found");
      err.httpCode = 404;
      throw err;
    }

    const participant = await this.resolveParticipant(user);

    const existing = await this.teamRepo
      .createQueryBuilder("team")
      .innerJoin("team.members", "member")
      .where("team.hackathonId = :hackathonId", { hackathonId: hackathon.id })
      .andWhere("member.id = :participantId", { participantId: participant.id })
      .getOne();

    if (existing) {
      const err: any = new Error("Already in a team for this hackathon");
      err.httpCode = 409;
      throw err;
    }

    const team = this.teamRepo.create({
      name: dto.name,
      hackathon,
      leader: participant,
      members: [participant],
    });

    const saved = await this.teamRepo.save(team);

    const full = await this.teamRepo.findOne({
      where: { id: saved.id },
      relations: ["hackathon", "leader", "members", "members.user"],
    });
    return toTeamDto(full!);
  }

  async join(teamId: string, user: User): Promise<TeamDto> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ["hackathon", "leader", "members", "members.user"],
    });
    if (!team) {
      const err: any = new Error("Team not found");
      err.httpCode = 404;
      throw err;
    }

    if (team.members.length >= team.hackathon.maxTeamSize) {
      const err: any = new Error("Team is already full");
      err.httpCode = 409;
      throw err;
    }

    const participant = await this.resolveParticipant(user);

    const alreadyMember = team.members.some((m) => m.id === participant.id);
    if (alreadyMember) {
      const err: any = new Error("Already a member of this team");
      err.httpCode = 409;
      throw err;
    }

    const otherTeam = await this.teamRepo
      .createQueryBuilder("team")
      .innerJoin("team.members", "member")
      .where("team.hackathonId = :hackathonId", { hackathonId: team.hackathon.id })
      .andWhere("member.id = :participantId", { participantId: participant.id })
      .getOne();

    if (otherTeam) {
      const err: any = new Error("Already in a team for this hackathon");
      err.httpCode = 409;
      throw err;
    }

    team.members.push(participant);
    const saved = await this.teamRepo.save(team);
    return toTeamDto(saved);
  }

  async findTeams(query: FindTeamsQueryDto, user: User): Promise<TeamsRecommendResponseDto> {
    const hackathon = await this.hackathonRepo.findOne({ where: { id: query.hackathonId } });
    if (!hackathon) {
      const err: any = new Error("Hackathon not found");
      err.httpCode = 404;
      throw err;
    }

    const hasSkillFilter = (query.skills?.length ?? 0) > 0;
    const hasPositionFilter = (query.positions?.length ?? 0) > 0;

    let scoreSkills: string[] | undefined = hasSkillFilter ? (query.skills as string[]) : undefined;
    let scorePositions: string[] | undefined = hasPositionFilter
      ? (query.positions as string[])
      : undefined;

    if (!hasSkillFilter || !hasPositionFilter) {
      try {
        const participant = await this.participantRepo.findOne({ where: { user: { id: user.id } } });
        if (participant) {
          const rec = await fetchRecommendations(
            hackathon.topic,
            hackathon.maxTeamSize,
            [{ skills: participant.skills, position: participant.position }],
          );
          if (!hasSkillFilter) scoreSkills = rec.recommended_skills.map((s) => s.skill);
          if (!hasPositionFilter) scorePositions = rec.recommended_positions.map((p) => p.position);
        }
      } catch {
      }
    }

    const hasScoreSkills = (scoreSkills?.length ?? 0) > 0;
    const hasScorePositions = (scorePositions?.length ?? 0) > 0;
    const hasScoring = hasScoreSkills || hasScorePositions;

    const params: any[] = [query.hackathonId, hackathon.maxTeamSize];
    let next = 3;
    const add = (v: any): string => {
      params.push(v);
      return `$${next++}`;
    };

    let memberScoreExpr: string;
    let filterExistsCond = "";

    if (hasScoring) {
      const skillRef = hasScoreSkills ? add(scoreSkills) : null;
      const posRef = hasScorePositions ? add(scorePositions) : null;

      if (hasSkillFilter || hasPositionFilter) {
        const filterParts: string[] = [];
        if (hasSkillFilter && skillRef) filterParts.push(`p.skills::text[] && ${skillRef}::text[]`);
        if (hasPositionFilter && posRef) filterParts.push(`p.position::text = ANY(${posRef}::text[])`);

        filterExistsCond = `AND EXISTS (
        SELECT 1 FROM team_members tm_f
        JOIN participants p ON p.id = tm_f."participantId"
        WHERE tm_f."teamId" = t.id AND (${filterParts.join(" OR ")})
      )`;
      }

      const skillScore = skillRef
        ? `(SELECT COUNT(*) FROM unnest(p.skills::text[]) s WHERE s = ANY(${skillRef}::text[]))::int`
        : "0";
      const posScore = posRef
        ? `(CASE WHEN p.position::text = ANY(${posRef}::text[]) THEN 1 ELSE 0 END)`
        : "0";
      memberScoreExpr = `${skillScore} + ${posScore}`;
    } else {
      memberScoreExpr = "0";
    }

    const scoreExpr = `(
      SELECT COALESCE(SUM(${memberScoreExpr}), 0)
      FROM team_members tm_s
      JOIN participants p ON p.id = tm_s."participantId"
      WHERE tm_s."teamId" = t.id
    )`;

    const extraClauses: string[] = [];

    if (query.name) {
      extraClauses.push(`LOWER(t.name) LIKE ${add("%" + query.name.toLowerCase() + "%")}`);
    }

    const expConds: string[] = [];
    if (query.minExperience !== undefined)
      expConds.push(`p_e."yearsOfExperience" >= ${add(query.minExperience)}`);
    if (query.maxExperience !== undefined)
      expConds.push(`p_e."yearsOfExperience" <= ${add(query.maxExperience)}`);
    if (expConds.length > 0) {
      extraClauses.push(`EXISTS (
        SELECT 1 FROM team_members tm_e
        JOIN participants p_e ON p_e.id = tm_e."participantId"
        WHERE tm_e."teamId" = t.id AND ${expConds.join(" AND ")}
      )`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const limitRef = add(limit);
    const offsetRef = add((page - 1) * limit);

    const whereExtra = extraClauses.length > 0 ? "AND " + extraClauses.join("\n      AND ") : "";

    const sql = `
      SELECT t.id, ${scoreExpr} AS score, COUNT(*) OVER() AS total
      FROM teams t
      WHERE t."hackathonId" = $1
        AND (SELECT COUNT(*) FROM team_members tm WHERE tm."teamId" = t.id) < $2
        ${whereExtra}
        ${filterExistsCond}
      ORDER BY score DESC
      LIMIT ${limitRef} OFFSET ${offsetRef}
    `;

    const rows: Array<{ id: string; score: string; total: string }> = await AppDataSource.query(
      sql,
      params,
    );

    const total = rows.length > 0 ? parseInt(rows[0].total, 10) : 0;
    const teamIds = rows.map((r) => r.id);

    let teams: TeamDto[] = [];
    if (teamIds.length > 0) {
      const fullTeams = await this.teamRepo.find({
        where: { id: In(teamIds) },
        relations: ["hackathon", "leader", "members", "members.user"],
      });
      const teamMap = new Map(fullTeams.map((t) => [t.id, t]));
      teams = teamIds.filter((id) => teamMap.has(id)).map((id) => toTeamDto(teamMap.get(id)!));
    }

    const result = new TeamsRecommendResponseDto();
    result.teams = teams;
    result.total = total;
    result.page = page;
    result.limit = limit;
    return result;
  }

  async kickMember(teamId: string, participantId: string, user: User): Promise<TeamDto> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ["hackathon", "leader", "leader.user", "members", "members.user"],
    });
    if (!team) {
      const err: any = new Error("Team not found");
      err.httpCode = 404;
      throw err;
    }
    if (team.leader.user.id !== user.id) {
      const err: any = new Error("Only the team leader can kick members");
      err.httpCode = 403;
      throw err;
    }
    if (team.leader.id === participantId) {
      const err: any = new Error("Cannot kick the team leader");
      err.httpCode = 400;
      throw err;
    }
    const memberIdx = team.members.findIndex((m) => m.id === participantId);
    if (memberIdx === -1) {
      const err: any = new Error("Participant is not a member of this team");
      err.httpCode = 404;
      throw err;
    }
    team.members.splice(memberIdx, 1);
    const saved = await this.teamRepo.save(team);

    // Remove kicked user from the team chat room if it exists
    const chatRoomRepo = AppDataSource.getRepository(
      (await import("../entities/ChatRoom")).ChatRoom,
    );
    const chatRoom = await chatRoomRepo.findOne({
      where: { teamId },
      relations: ["members"],
    });
    if (chatRoom) {
      const kickedUser = await AppDataSource.getRepository(
        (await import("../entities/User")).User,
      ).findOne({ where: { participant: { id: participantId } }, relations: ["participant"] });
      if (kickedUser) {
        chatRoom.members = chatRoom.members.filter((m) => m.id !== kickedUser.id);
        await chatRoomRepo.save(chatRoom);
      }
    }

    return toTeamDto(saved);
  }

  async delete(teamId: string, user: User): Promise<void> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ["leader", "leader.user"],
    });
    if (!team) {
      const err: any = new Error("Team not found");
      err.httpCode = 404;
      throw err;
    }
    if (team.leader.user.id !== user.id) {
      const err: any = new Error("Only the team leader can delete the team");
      err.httpCode = 403;
      throw err;
    }
    await this.teamRepo.remove(team);
  }

  async findMembers(
    teamId: string,
    query: FindMembersQueryDto,
  ): Promise<MembersRecommendResponseDto> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ["hackathon", "leader", "members", "members.user"],
    });
    if (!team) {
      const err: any = new Error("Team not found");
      err.httpCode = 404;
      throw err;
    }

    const hasSkillFilter = (query.skills?.length ?? 0) > 0;
    const hasPositionFilter = (query.positions?.length ?? 0) > 0;

    let scoreSkills: string[] | undefined = hasSkillFilter ? (query.skills as string[]) : undefined;
    let scorePositions: string[] | undefined = hasPositionFilter
      ? (query.positions as string[])
      : undefined;

    if (!hasSkillFilter || !hasPositionFilter) {
      try {
        const memberPayloads = team.members.map((m) => ({
          skills: m.skills,
          position: m.position,
        }));
        const rec = await fetchRecommendations(
          team.hackathon.topic,
          team.hackathon.maxTeamSize,
          memberPayloads,
        );
        if (!hasSkillFilter) scoreSkills = rec.recommended_skills.map((s) => s.skill);
        if (!hasPositionFilter) scorePositions = rec.recommended_positions.map((p) => p.position);
      } catch {
      }
    }

    const hasScoreSkills = (scoreSkills?.length ?? 0) > 0;
    const hasScorePositions = (scorePositions?.length ?? 0) > 0;
    const hasScoring = hasScoreSkills || hasScorePositions;

    const params: any[] = [team.hackathon.id];
    let next = 2;
    const add = (v: any): string => {
      params.push(v);
      return `$${next++}`;
    };

    let scoreExpr: string;
    let filterCond = "";

    if (hasScoring) {
      const skillRef = hasScoreSkills ? add(scoreSkills) : null;
      const posRef = hasScorePositions ? add(scorePositions) : null;

      if (hasSkillFilter || hasPositionFilter) {
        const filterParts: string[] = [];
        if (hasSkillFilter && skillRef) filterParts.push(`p.skills::text[] && ${skillRef}::text[]`);
        if (hasPositionFilter && posRef) filterParts.push(`p.position::text = ANY(${posRef}::text[])`);
        filterCond = `AND (${filterParts.join(" OR ")})`;
      }

      const skillScore = skillRef
        ? `(SELECT COUNT(*) FROM unnest(p.skills::text[]) s WHERE s = ANY(${skillRef}::text[]))::int`
        : "0";
      const posScore = posRef
        ? `(CASE WHEN p.position::text = ANY(${posRef}::text[]) THEN 1 ELSE 0 END)`
        : "0";
      scoreExpr = `(${skillScore} + ${posScore})`;
    } else {
      scoreExpr = "0";
    }

    const extraClauses: string[] = [];

    if (query.name) {
      extraClauses.push(
        `LOWER(u."firstName" || ' ' || u."lastName") LIKE ${add("%" + query.name.toLowerCase() + "%")}`,
      );
    }
    if (query.minExperience !== undefined)
      extraClauses.push(`p."yearsOfExperience" >= ${add(query.minExperience)}`);
    if (query.maxExperience !== undefined)
      extraClauses.push(`p."yearsOfExperience" <= ${add(query.maxExperience)}`);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const limitRef = add(limit);
    const offsetRef = add((page - 1) * limit);

    const whereExtra = extraClauses.length > 0 ? "AND " + extraClauses.join("\n      AND ") : "";

    const sql = `
      SELECT
        p.id,
        p.skills::text[]        AS skills,
        p.position::text        AS position,
        p."yearsOfExperience",
        u.id as "userId",
        u."firstName",
        u."lastName",
        ${scoreExpr}            AS score,
        COUNT(*) OVER()         AS total
      FROM participants p
      INNER JOIN users u ON u.id = p."userId"
      WHERE EXISTS (
        SELECT 1 FROM hackathon_registrations hr
        WHERE hr."hackathonId" = $1 AND hr."participantId" = p.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM team_members tm
        INNER JOIN teams t ON t.id = tm."teamId"
        WHERE t."hackathonId" = $1 AND tm."participantId" = p.id
      )
      ${whereExtra}
      ${filterCond}
      ORDER BY score DESC
      LIMIT ${limitRef} OFFSET ${offsetRef}
    `;

    const rows: Array<{
      id: string;
      userId: string;
      skills: string[];
      position: string | null;
      yearsOfExperience: number | null;
      firstName: string;
      lastName: string;
      score: string;
      total: string;
    }> = await AppDataSource.query(sql, params);

    const total = rows.length > 0 ? parseInt(rows[0].total, 10) : 0;

    const members = rows.map((row) => {
      const m = new TeamMemberDto();
      m.id = row.id;
      m.userId = row.userId;
      m.firstName = row.firstName;
      m.lastName = row.lastName;
      m.position = row.position as any;
      m.skills = row.skills as any[];
      m.yearsOfExperience = row.yearsOfExperience ?? undefined;
      return m;
    });

    const result = new MembersRecommendResponseDto();
    result.members = members;
    result.total = total;
    result.page = page;
    result.limit = limit;
    return result;
  }

  /** Returns pending JOIN_REQUESTs for a team (leader only). */
  async getTeamRequests(teamId: string, user: User): Promise<TeamRequestItemDto[]> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ["leader", "leader.user"],
    });
    if (!team) {
      const err: any = new Error("Team not found");
      err.httpCode = 404;
      throw err;
    }
    if (team.leader.user.id !== user.id) {
      const err: any = new Error("Only the team leader can view join requests");
      err.httpCode = 403;
      throw err;
    }

    const requests = await this.requestRepo.find({
      where: {
        team: { id: teamId },
        type: TeamRequestType.JOIN_REQUEST,
        status: TeamRequestStatus.PENDING,
      },
      relations: ["participant", "participant.user", "team", "team.hackathon"],
      order: { createdAt: "DESC" },
    });

    return requests.map((r) => this.toRequestItemDto(r));
  }

  /** Returns pending INVITEs addressed to the current participant. */
  async getMyInvites(user: User): Promise<TeamRequestItemDto[]> {
    const participant = await this.participantRepo.findOne({ where: { user: { id: user.id } } });
    if (!participant) return [];

    const requests = await this.requestRepo.find({
      where: {
        participant: { id: participant.id },
        type: TeamRequestType.INVITE,
        status: TeamRequestStatus.PENDING,
      },
      relations: ["participant", "participant.user", "team", "team.hackathon"],
      order: { createdAt: "DESC" },
    });

    return requests.map((r) => this.toRequestItemDto(r));
  }
  private toRequestItemDto(r: TeamRequest): TeamRequestItemDto {
    const p = new TeamRequestParticipantDto();
    p.id = r.participant.id;
    p.userId = r.participant.user.id;
    p.firstName = r.participant.user.firstName;
    p.lastName = r.participant.user.lastName;
    p.position = r.participant.position;
    p.skills = r.participant.skills;
    p.yearsOfExperience = r.participant.yearsOfExperience;

    const dto = new TeamRequestItemDto();
    dto.id = r.id;
    dto.type = r.type;
    dto.teamId = r.team.id;
    dto.teamName = r.team.name;
    dto.hackathonId = r.team.hackathon.id;
    dto.participant = p;
    dto.createdAt = r.createdAt;
    return dto;
  }
}
