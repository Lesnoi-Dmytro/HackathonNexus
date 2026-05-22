import sinon from "sinon";

jest.mock("../data-source", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    createQueryBuilder: jest.fn(),
    query: jest.fn(),
  },
}));

jest.mock("../clients/RecommendClient", () => ({
  fetchRecommendations: jest.fn().mockResolvedValue({
    recommended_skills: [],
    recommended_positions: [],
  }),
}));

import { AppDataSource } from "../data-source";
import { UserRole } from "../models/enums";
import { TeamService } from "../services/TeamService";
import { makeQueryBuilder, makeRepo } from "./helpers/mockRepo";

function makeUser(overrides: Record<string, any> = {}) {
  return { id: "user-1", role: UserRole.PARTICIPANT, ...overrides };
}

function makeParticipant(overrides: Record<string, any> = {}) {
  return {
    id: "part-1",
    skills: ["TypeScript"],
    position: "Backend",
    yearsOfExperience: 2,
    user: makeUser(),
    ...overrides,
  };
}

function makeHackathon(overrides: Record<string, any> = {}) {
  return {
    id: "hack-1",
    topic: "AI",
    maxTeamSize: 4,
    ...overrides,
  };
}

function makeTeam(overrides: Record<string, any> = {}) {
  const leader = makeParticipant({ id: "part-leader", user: makeUser({ id: "user-leader" }) });
  return {
    id: "team-1",
    name: "Dream Team",
    hackathon: makeHackathon(),
    leader,
    members: [leader],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("TeamService", () => {
  let service: TeamService;
  let teamRepo: ReturnType<typeof makeRepo>;
  let hackathonRepo: ReturnType<typeof makeRepo>;
  let participantRepo: ReturnType<typeof makeRepo>;
  let requestRepo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    teamRepo = makeRepo();
    hackathonRepo = makeRepo();
    participantRepo = makeRepo();
    requestRepo = makeRepo();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      const name = entity?.name ?? "";
      if (name === "Team") return teamRepo;
      if (name === "Hackathon") return hackathonRepo;
      if (name === "Participant") return participantRepo;
      if (name === "TeamRequest") return requestRepo;
      return makeRepo();
    });

    service = new TeamService();
  });

  afterEach(() => sinon.restore());

  // ── getMyTeam ──────────────────────────────────────────────────────────────

  describe("getMyTeam", () => {
    it("returns null when participant profile not found", async () => {
      participantRepo.findOne.resolves(null);

      const result = await service.getMyTeam("hack-1", makeUser() as any);
      expect(result).toBeNull();
    });

    it("returns null when no team found", async () => {
      participantRepo.findOne.resolves(makeParticipant() as any);
      const qb = makeQueryBuilder({ getOne: sinon.stub().resolves(null) });
      teamRepo.createQueryBuilder.returns(qb as any);

      const result = await service.getMyTeam("hack-1", makeUser() as any);
      expect(result).toBeNull();
    });

    it("returns TeamDto when team found", async () => {
      participantRepo.findOne.resolves(makeParticipant() as any);
      const team = makeTeam();
      const qb = makeQueryBuilder({ getOne: sinon.stub().resolves(team) });
      teamRepo.createQueryBuilder.returns(qb as any);

      const result = await service.getMyTeam("hack-1", makeUser() as any);
      expect(result!.id).toBe("team-1");
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("throws 404 when hackathon not found", async () => {
      hackathonRepo.findOne.resolves(null);

      await expect(
        service.create({ hackathonId: "missing", name: "Team" }, makeUser() as any),
      ).rejects.toMatchObject({ httpCode: 404 });
    });

    it("throws 422 when participant profile not found", async () => {
      hackathonRepo.findOne.resolves(makeHackathon() as any);
      participantRepo.findOne.resolves(null);

      await expect(
        service.create({ hackathonId: "hack-1", name: "Team" }, makeUser() as any),
      ).rejects.toMatchObject({ httpCode: 422 });
    });

    it("throws 409 when already in a team for this hackathon", async () => {
      hackathonRepo.findOne.resolves(makeHackathon() as any);
      participantRepo.findOne.resolves(makeParticipant() as any);
      const qb = makeQueryBuilder({ getOne: sinon.stub().resolves(makeTeam()) });
      teamRepo.createQueryBuilder.returns(qb as any);

      await expect(
        service.create({ hackathonId: "hack-1", name: "Team" }, makeUser() as any),
      ).rejects.toMatchObject({ httpCode: 409 });
    });

    it("creates and returns TeamDto", async () => {
      hackathonRepo.findOne.resolves(makeHackathon() as any);
      participantRepo.findOne.resolves(makeParticipant() as any);
      const qb = makeQueryBuilder({ getOne: sinon.stub().resolves(null) });
      teamRepo.createQueryBuilder.returns(qb as any);

      const team = makeTeam();
      teamRepo.create.returns(team as any);
      teamRepo.save.resolves(team as any);
      teamRepo.findOne.resolves(team as any);

      const result = await service.create(
        { hackathonId: "hack-1", name: "Dream Team" },
        makeUser() as any,
      );

      expect(result.id).toBe("team-1");
      expect(result.name).toBe("Dream Team");
    });
  });

  // ── join ──────────────────────────────────────────────────────────────────

  describe("join", () => {
    it("throws 404 when team not found", async () => {
      teamRepo.findOne.resolves(null);

      await expect(service.join("missing", makeUser() as any)).rejects.toMatchObject({
        httpCode: 404,
      });
    });

    it("throws 409 when team is full", async () => {
      const team = makeTeam({
        hackathon: makeHackathon({ maxTeamSize: 1 }),
        members: [makeParticipant()],
      });
      teamRepo.findOne.resolves(team as any);

      await expect(service.join("team-1", makeUser() as any)).rejects.toMatchObject({
        httpCode: 409,
      });
    });

    it("throws 409 when user is already a member", async () => {
      const participant = makeParticipant();
      const team = makeTeam({ members: [participant] });
      teamRepo.findOne.resolves(team as any);
      participantRepo.findOne.resolves(participant as any);

      await expect(service.join("team-1", makeUser() as any)).rejects.toMatchObject({
        httpCode: 409,
      });
    });

    it("joins successfully", async () => {
      const existingMember = makeParticipant({ id: "other-part" });
      const newParticipant = makeParticipant({ id: "new-part" });
      const team = makeTeam({ members: [existingMember] });
      teamRepo.findOne.resolves(team as any);
      participantRepo.findOne.resolves(newParticipant as any);

      const otherTeamQb = makeQueryBuilder({ getOne: sinon.stub().resolves(null) });
      teamRepo.createQueryBuilder.returns(otherTeamQb as any);

      teamRepo.save.resolves({ ...team, members: [existingMember, newParticipant] } as any);

      const result = await service.join("team-1", makeUser() as any);
      expect(result.id).toBe("team-1");
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("throws 404 when team not found", async () => {
      teamRepo.findOne.resolves(null);

      await expect(service.delete("missing", makeUser() as any)).rejects.toMatchObject({
        httpCode: 404,
      });
    });

    it("throws 403 when caller is not the leader", async () => {
      const team = makeTeam({
        leader: makeParticipant({ user: makeUser({ id: "other-user" }) }),
      });
      teamRepo.findOne.resolves(team as any);

      await expect(service.delete("team-1", makeUser({ id: "user-1" }) as any)).rejects.toMatchObject({
        httpCode: 403,
      });
    });

    it("deletes team when caller is leader", async () => {
      const leader = makeParticipant({ user: makeUser({ id: "leader-id" }) });
      const team = makeTeam({ leader });
      teamRepo.findOne.resolves(team as any);
      teamRepo.remove.resolves();

      await expect(
        service.delete("team-1", makeUser({ id: "leader-id" }) as any),
      ).resolves.toBeUndefined();

      expect(teamRepo.remove.calledOnce).toBe(true);
    });
  });

  // ── kickMember ────────────────────────────────────────────────────────────

  describe("kickMember", () => {
    it("throws 404 when team not found", async () => {
      teamRepo.findOne.resolves(null);

      await expect(
        service.kickMember("missing", "part-1", makeUser() as any),
      ).rejects.toMatchObject({ httpCode: 404 });
    });

    it("throws 403 when caller is not the leader", async () => {
      const team = makeTeam({
        leader: makeParticipant({ user: makeUser({ id: "other-user" }) }),
      });
      teamRepo.findOne.resolves(team as any);

      await expect(
        service.kickMember("team-1", "part-1", makeUser({ id: "not-leader" }) as any),
      ).rejects.toMatchObject({ httpCode: 403 });
    });

    it("throws 400 when trying to kick the leader", async () => {
      const leader = makeParticipant({ id: "leader-part", user: makeUser({ id: "leader-id" }) });
      const team = makeTeam({ leader, members: [leader] });
      teamRepo.findOne.resolves(team as any);

      await expect(
        service.kickMember("team-1", "leader-part", makeUser({ id: "leader-id" }) as any),
      ).rejects.toMatchObject({ httpCode: 400 });
    });

    it("throws 404 when participant is not a member", async () => {
      const leader = makeParticipant({ id: "leader-part", user: makeUser({ id: "leader-id" }) });
      const team = makeTeam({ leader, members: [leader] });
      teamRepo.findOne.resolves(team as any);

      await expect(
        service.kickMember("team-1", "non-member", makeUser({ id: "leader-id" }) as any),
      ).rejects.toMatchObject({ httpCode: 404 });
    });

    it("kicks the member successfully", async () => {
      const leader = makeParticipant({ id: "leader-part", user: makeUser({ id: "leader-id" }) });
      const member = makeParticipant({ id: "kicked-part", user: makeUser({ id: "kicked-user" }) });
      const team = makeTeam({ leader, members: [leader, member] });
      teamRepo.findOne.resolves(team as any);
      teamRepo.save.resolves({ ...team, members: [leader] } as any);

      // Mock dynamic imports used in kickMember for ChatRoom/User
      jest.doMock("../entities/ChatRoom", () => ({ ChatRoom: class ChatRoom {} }));
      jest.doMock("../entities/User", () => ({ User: class User {} }));

      // The chatRoomRepo and userRepo used inside kickMember via AppDataSource.getRepository
      const chatRoomRepo = makeRepo();
      chatRoomRepo.findOne.resolves(null); // No chat room exists
      (AppDataSource.getRepository as jest.Mock).mockReturnValue(chatRoomRepo);

      const result = await service.kickMember(
        "team-1",
        "kicked-part",
        makeUser({ id: "leader-id" }) as any,
      );

      expect(result.id).toBe("team-1");
    });
  });

  // ── findTeams ─────────────────────────────────────────────────────────────

  describe("findTeams", () => {
    it("throws 404 when hackathon not found", async () => {
      hackathonRepo.findOne.resolves(null);

      await expect(
        service.findTeams({ hackathonId: "missing" }, makeUser() as any),
      ).rejects.toMatchObject({ httpCode: 404 });
    });

    it("returns empty result when no teams match query", async () => {
      hackathonRepo.findOne.resolves(makeHackathon() as any);
      participantRepo.findOne.resolves(null);
      (AppDataSource.query as jest.Mock).mockResolvedValue([]);

      const result = await service.findTeams({ hackathonId: "hack-1" }, makeUser() as any);
      expect(result.teams).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns teams when query returns rows", async () => {
      hackathonRepo.findOne.resolves(makeHackathon() as any);
      participantRepo.findOne.resolves(makeParticipant() as any);
      (AppDataSource.query as jest.Mock).mockResolvedValue([
        { id: "team-1", score: "2", total: "1" },
      ]);
      const team = makeTeam();
      teamRepo.find.resolves([team] as any);

      const result = await service.findTeams({ hackathonId: "hack-1" }, makeUser() as any);
      expect(result.total).toBe(1);
      expect(result.teams).toHaveLength(1);
    });

    it("applies name/experience filters in SQL", async () => {
      hackathonRepo.findOne.resolves(makeHackathon() as any);
      participantRepo.findOne.resolves(null);
      (AppDataSource.query as jest.Mock).mockClear();
      (AppDataSource.query as jest.Mock).mockResolvedValue([]);

      await service.findTeams(
        { hackathonId: "hack-1", name: "dream", minExperience: 1, maxExperience: 5 },
        makeUser() as any,
      );

      const calls = (AppDataSource.query as jest.Mock).mock.calls;
      const callArgs = calls[calls.length - 1][0] as string;
      expect(callArgs).toContain("LOWER(t.name) LIKE");
    });

    it("applies skill/position filters when provided", async () => {
      hackathonRepo.findOne.resolves(makeHackathon() as any);
      participantRepo.findOne.resolves(makeParticipant() as any);
      (AppDataSource.query as jest.Mock).mockClear();
      (AppDataSource.query as jest.Mock).mockResolvedValue([]);

      await service.findTeams(
        { hackathonId: "hack-1", skills: ["TypeScript"] as any, positions: ["Backend"] as any },
        makeUser() as any,
      );

      const calls = (AppDataSource.query as jest.Mock).mock.calls;
      expect(calls[calls.length - 1][0]).toContain("skills::text[]");
    });
  });

  // ── findMembers ───────────────────────────────────────────────────────────

  describe("findMembers", () => {
    it("throws 404 when team not found", async () => {
      teamRepo.findOne.resolves(null);

      await expect(service.findMembers("missing", {})).rejects.toMatchObject({ httpCode: 404 });
    });

    it("returns empty when no members match", async () => {
      teamRepo.findOne.resolves(makeTeam() as any);
      (AppDataSource.query as jest.Mock).mockResolvedValue([]);

      const result = await service.findMembers("team-1", {});
      expect(result.members).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns members from raw SQL result", async () => {
      teamRepo.findOne.resolves(makeTeam() as any);
      (AppDataSource.query as jest.Mock).mockResolvedValue([
        {
          id: "part-2",
          userId: "user-2",
          firstName: "Bob",
          lastName: "Builder",
          position: "Frontend",
          skills: ["React"],
          yearsOfExperience: 3,
          score: "1",
          total: "1",
        },
      ]);

      const result = await service.findMembers("team-1", {});
      expect(result.total).toBe(1);
      expect(result.members[0].firstName).toBe("Bob");
    });

    it("applies skill/position filters and score when both provided", async () => {
      teamRepo.findOne.resolves(makeTeam() as any);
      (AppDataSource.query as jest.Mock).mockClear();
      (AppDataSource.query as jest.Mock).mockResolvedValue([]);

      await service.findMembers("team-1", {
        skills: ["React"] as any,
        positions: ["Frontend"] as any,
      });

      const calls = (AppDataSource.query as jest.Mock).mock.calls;
      const sql = calls[calls.length - 1][0] as string;
      expect(sql).toContain("FROM participants p");
    });

    it("applies name and experience filters", async () => {
      teamRepo.findOne.resolves(makeTeam() as any);
      (AppDataSource.query as jest.Mock).mockClear();
      (AppDataSource.query as jest.Mock).mockResolvedValue([]);

      await service.findMembers("team-1", { name: "alice", minExperience: 1, maxExperience: 10 });

      const calls = (AppDataSource.query as jest.Mock).mock.calls;
      const sql = calls[calls.length - 1][0] as string;
      expect(sql).toContain("firstName");
    });
  });

  // ── getTeamRequests ───────────────────────────────────────────────────────

  describe("getTeamRequests", () => {
    it("throws 404 when team not found", async () => {
      teamRepo.findOne.resolves(null);

      await expect(
        service.getTeamRequests("missing", makeUser() as any),
      ).rejects.toMatchObject({ httpCode: 404 });
    });

    it("throws 403 when caller is not leader", async () => {
      const team = makeTeam({
        leader: makeParticipant({ user: makeUser({ id: "other-user" }) }),
      });
      teamRepo.findOne.resolves(team as any);

      await expect(
        service.getTeamRequests("team-1", makeUser({ id: "not-leader" }) as any),
      ).rejects.toMatchObject({ httpCode: 403 });
    });

    it("returns team join requests", async () => {
      const leader = makeParticipant({ user: makeUser({ id: "leader-id" }) });
      const team = makeTeam({ leader });
      teamRepo.findOne.resolves(team as any);

      const mockRequest = {
        id: "req-1",
        type: "join_request",
        status: "pending",
        participant: {
          ...makeParticipant(),
          user: makeUser(),
        },
        team: { id: "team-1", name: "Dream Team", hackathon: { id: "hack-1" } },
        createdAt: new Date(),
      };
      requestRepo.find.resolves([mockRequest] as any);

      const result = await service.getTeamRequests("team-1", makeUser({ id: "leader-id" }) as any);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("req-1");
    });
  });

  // ── getMyInvites ──────────────────────────────────────────────────────────

  describe("getMyInvites", () => {
    it("returns empty array when participant profile not found", async () => {
      participantRepo.findOne.resolves(null);

      const result = await service.getMyInvites(makeUser() as any);
      expect(result).toEqual([]);
    });

    it("returns invites for participant", async () => {
      participantRepo.findOne.resolves(makeParticipant() as any);

      const mockInvite = {
        id: "inv-1",
        type: "invite",
        status: "pending",
        participant: {
          ...makeParticipant(),
          user: makeUser(),
        },
        team: { id: "team-1", name: "Dream Team", hackathon: { id: "hack-1" } },
        createdAt: new Date(),
      };
      requestRepo.find.resolves([mockInvite] as any);

      const result = await service.getMyInvites(makeUser() as any);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("inv-1");
    });
  });

  // ── join - otherTeam conflict ─────────────────────────────────────────────

  describe("join - already in another team", () => {
    it("throws 409 when user is already in another team for this hackathon", async () => {
      const existingMember = makeParticipant({ id: "other-part" });
      const newParticipant = makeParticipant({ id: "new-part" });
      const team = makeTeam({ members: [existingMember] });
      teamRepo.findOne.resolves(team as any);
      participantRepo.findOne.resolves(newParticipant as any);

      const otherTeamQb = makeQueryBuilder({ getOne: sinon.stub().resolves(makeTeam()) });
      teamRepo.createQueryBuilder.returns(otherTeamQb as any);

      await expect(service.join("team-1", makeUser() as any)).rejects.toMatchObject({
        httpCode: 409,
      });
    });
  });
});
