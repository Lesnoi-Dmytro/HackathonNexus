import { In } from "typeorm";
import { fetchRecommendations } from "../clients/RecommendClient";
import { AppDataSource } from "../data-source";
import {
  MembersRecommendResponseDto,
  TeamDto,
  TeamMemberDto,
  TeamsRecommendResponseDto,
} from "../dto/response.dto";
import { CreateTeamDto, FindMembersQueryDto, FindTeamsQueryDto } from "../dto/team.dto";
import { Hackathon } from "../entities/Hackathon";
import { Participant } from "../entities/Participant";
import { Team } from "../entities/Team";
import { User } from "../entities/User";

function toTeamDto(team: Team): TeamDto {
  const dto = new TeamDto();
  dto.id = team.id;
  dto.name = team.name;
  dto.hackathonId = team.hackathon.id;
  dto.leaderId = team.leader.id;
  dto.members = team.members.map((p) => {
    const m = new TeamMemberDto();
    m.id = p.id;
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

    const participant = await this.participantRepo.findOne({
      where: { user: { id: user.id } },
    });
    if (!participant) {
      const err: any = new Error("Participant profile not found");
      err.httpCode = 422;
      throw err;
    }

    const hasSkillFilter = (query.skills?.length ?? 0) > 0;
    const hasPositionFilter = (query.positions?.length ?? 0) > 0;
    const hasFilters = hasSkillFilter || hasPositionFilter;

    let recommendedSkills: { skill: string; score: number }[] | undefined;
    let recommendedPositions: { position: string; score: number }[] | undefined;

    const params: any[] = [query.hackathonId, hackathon.maxTeamSize];
    let next = 3;
    const add = (v: any): string => {
      params.push(v);
      return `$${next++}`;
    };

    let memberScoreExpr: string;
    let filterExistsCond = "";

    if (hasFilters) {
      const skillRef = hasSkillFilter ? add(query.skills) : null;
      const posRef = hasPositionFilter ? add(query.positions) : null;

      const orParts: string[] = [];
      if (skillRef) orParts.push(`p.skills::text[] && ${skillRef}::text[]`);
      if (posRef) orParts.push(`p.position::text = ANY(${posRef}::text[])`);

      filterExistsCond = `AND EXISTS (
        SELECT 1 FROM team_members tm_f
        JOIN participants p ON p.id = tm_f."participantId"
        WHERE tm_f."teamId" = t.id AND (${orParts.join(" OR ")})
      )`;

      const skillScore = skillRef
        ? `(SELECT COUNT(*) FROM unnest(p.skills::text[]) s WHERE s = ANY(${skillRef}::text[]))::int`
        : "0";
      const posScore = posRef
        ? `(CASE WHEN p.position::text = ANY(${posRef}::text[]) THEN 1 ELSE 0 END)`
        : "0";
      memberScoreExpr = `${skillScore} + ${posScore}`;
    } else {
      const rec = await fetchRecommendations(
        hackathon.topic,
        hackathon.maxTeamSize,
        [{ skills: participant.skills, position: participant.position }],
        6,
        3,
      );
      recommendedSkills = rec.recommended_skills;
      recommendedPositions = rec.recommended_positions;

      const parts: string[] = [];
      if (rec.recommended_skills.length > 0) {
        const snRef = add(rec.recommended_skills.map((s) => s.skill));
        const swRef = add(rec.recommended_skills.map((s) => s.score));
        parts.push(
          `COALESCE((SELECT SUM(w) FROM unnest(${snRef}::text[], ${swRef}::float8[]) AS sw(n, w) WHERE n = ANY(p.skills::text[])), 0)`,
        );
      }
      if (rec.recommended_positions.length > 0) {
        const pnRef = add(rec.recommended_positions.map((p) => p.position));
        const pwRef = add(rec.recommended_positions.map((p) => p.score));
        parts.push(
          `COALESCE((SELECT w FROM unnest(${pnRef}::text[], ${pwRef}::float8[]) AS pw(n, w) WHERE p.position::text = n LIMIT 1), 0)`,
        );
      }
      memberScoreExpr = parts.length > 0 ? parts.join(" + ") : "0";
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
    result.recommendedSkills = recommendedSkills;
    result.recommendedPositions = recommendedPositions;
    return result;
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
    const hasFilters = hasSkillFilter || hasPositionFilter;

    let recommendedSkills: { skill: string; score: number }[] | undefined;
    let recommendedPositions: { position: string; score: number }[] | undefined;

    const params: any[] = [team.hackathon.id];
    let next = 2;
    const add = (v: any): string => {
      params.push(v);
      return `$${next++}`;
    };

    let scoreExpr: string;
    let filterCond = "";

    if (hasFilters) {
      const skillRef = hasSkillFilter ? add(query.skills) : null;
      const posRef = hasPositionFilter ? add(query.positions) : null;

      const orParts: string[] = [];
      if (skillRef) orParts.push(`p.skills::text[] && ${skillRef}::text[]`);
      if (posRef) orParts.push(`p.position::text = ANY(${posRef}::text[])`);
      filterCond = `AND (${orParts.join(" OR ")})`;

      const skillScore = skillRef
        ? `(SELECT COUNT(*) FROM unnest(p.skills::text[]) s WHERE s = ANY(${skillRef}::text[]))::int`
        : "0";
      const posScore = posRef
        ? `(CASE WHEN p.position::text = ANY(${posRef}::text[]) THEN 1 ELSE 0 END)`
        : "0";
      scoreExpr = `(${skillScore} + ${posScore})`;
    } else {
      const rec = await fetchRecommendations(
        team.hackathon.topic,
        team.hackathon.maxTeamSize,
        team.members.map((m) => ({ skills: m.skills, position: m.position })),
        6,
        3,
      );
      recommendedSkills = rec.recommended_skills;
      recommendedPositions = rec.recommended_positions;

      const parts: string[] = [];
      if (rec.recommended_skills.length > 0) {
        const snRef = add(rec.recommended_skills.map((s) => s.skill));
        const swRef = add(rec.recommended_skills.map((s) => s.score));
        parts.push(
          `COALESCE((SELECT SUM(w) FROM unnest(${snRef}::text[], ${swRef}::float8[]) AS sw(n, w) WHERE n = ANY(p.skills::text[])), 0)`,
        );
      }
      if (rec.recommended_positions.length > 0) {
        const pnRef = add(rec.recommended_positions.map((p) => p.position));
        const pwRef = add(rec.recommended_positions.map((p) => p.score));
        parts.push(
          `COALESCE((SELECT w FROM unnest(${pnRef}::text[], ${pwRef}::float8[]) AS pw(n, w) WHERE p.position::text = n LIMIT 1), 0)`,
        );
      }
      scoreExpr = parts.length > 0 ? `(${parts.join(" + ")})` : "0";
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
        u."firstName",
        u."lastName",
        ${scoreExpr}            AS score,
        COUNT(*) OVER()         AS total
      FROM participants p
      INNER JOIN users u ON u.id = p."userId"
      WHERE NOT EXISTS (
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
    result.recommendedSkills = recommendedSkills;
    result.recommendedPositions = recommendedPositions;
    return result;
  }
}
