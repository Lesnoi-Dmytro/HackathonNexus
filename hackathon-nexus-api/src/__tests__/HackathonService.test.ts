import sinon from "sinon";

jest.mock("../data-source", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    createQueryBuilder: jest.fn(),
    query: jest.fn(),
  },
}));

import { AppDataSource } from "../data-source";
import { HackathonTopic, UserRole } from "../models/enums";
import { HackathonService } from "../services/HackathonService";
import { makeQueryBuilder, makeRepo } from "./helpers/mockRepo";

function makeAdmin(overrides: Record<string, any> = {}) {
  return { id: "admin-1", role: UserRole.HACKATHON_ADMIN, ...overrides };
}

function makeParticipantUser(overrides: Record<string, any> = {}) {
  return { id: "user-1", role: UserRole.PARTICIPANT, ...overrides };
}

function makeHackathon(overrides: Record<string, any> = {}) {
  return {
    id: "hack-1",
    title: "HackFest",
    description: "Desc",
    topic: HackathonTopic.AI_ML,
    startDate: new Date("2025-01-01"),
    durationHours: 48,
    maxTeamSize: 4,
    maxParticipants: 100,
    imageUrl: null,
    createdBy: { id: "admin-1" },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeParticipant(overrides: Record<string, any> = {}) {
  return { id: "part-1", ...overrides };
}

describe("HackathonService", () => {
  let service: HackathonService;
  let hackathonRepo: ReturnType<typeof makeRepo>;
  let participantRepo: ReturnType<typeof makeRepo>;
  let globalQb: ReturnType<typeof makeQueryBuilder>;

  beforeEach(() => {
    hackathonRepo = makeRepo();
    participantRepo = makeRepo();
    globalQb = makeQueryBuilder();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      const name = entity?.name ?? "";
      if (name === "Participant") return participantRepo;
      return hackathonRepo;
    });

    (AppDataSource.createQueryBuilder as jest.Mock).mockReturnValue(globalQb);

    service = new HackathonService();
  });

  afterEach(() => sinon.restore());

  // ── create ─────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates and returns a HackathonDto", async () => {
      const hack = makeHackathon();
      hackathonRepo.create.returns(hack as any);
      hackathonRepo.save.resolves(hack as any);

      const result = await service.create(
        {
          title: "HackFest",
          description: "Desc",
          topic: HackathonTopic.AI_ML,
          startDate: new Date("2025-01-01"),
          durationHours: 48,
          maxTeamSize: 4,
          maxParticipants: 100,
        },
        makeAdmin() as any,
      );

      expect(result.id).toBe("hack-1");
      expect(result.title).toBe("HackFest");
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates title and returns HackathonDto", async () => {
      const hack = makeHackathon();
      hackathonRepo.findOne.resolves(hack as any);
      hackathonRepo.save.resolves({ ...hack, title: "Updated" } as any);

      const result = await service.update("hack-1", { title: "Updated" }, makeAdmin() as any);
      expect(result.title).toBe("Updated");
    });

    it("throws 404 when hackathon not found", async () => {
      hackathonRepo.findOne.resolves(null);

      await expect(service.update("missing", {}, makeAdmin() as any)).rejects.toMatchObject({
        httpCode: 404,
      });
    });

    it("throws 403 when admin does not own the hackathon", async () => {
      hackathonRepo.findOne.resolves(makeHackathon({ createdBy: { id: "other-admin" } }) as any);

      await expect(service.update("hack-1", {}, makeAdmin() as any)).rejects.toMatchObject({
        httpCode: 403,
      });
    });
  });

  // ── getOne ─────────────────────────────────────────────────────────────────

  describe("getOne", () => {
    it("returns HackathonDto when found", async () => {
      hackathonRepo.findOne.resolves(makeHackathon() as any);
      // participantRepo.findOne for resolveParticipantId
      participantRepo.findOne.resolves(null);
      // countMap from globalQb
      globalQb.getRawMany.resolves([]);

      const result = await service.getOne("hack-1", null);
      expect(result.id).toBe("hack-1");
    });

    it("throws 404 when hackathon not found", async () => {
      hackathonRepo.findOne.resolves(null);

      await expect(service.getOne("missing", null)).rejects.toMatchObject({ httpCode: 404 });
    });
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe("register", () => {
    it("throws 403 for non-participant users", async () => {
      await expect(service.register("hack-1", makeAdmin() as any)).rejects.toMatchObject({
        httpCode: 403,
      });
    });

    it("throws 404 when hackathon not found", async () => {
      hackathonRepo.findOne.resolves(null);

      await expect(
        service.register("missing", makeParticipantUser() as any),
      ).rejects.toMatchObject({ httpCode: 404 });
    });

    it("throws 422 when participant profile not found", async () => {
      hackathonRepo.findOne.resolves(makeHackathon() as any);
      participantRepo.findOne.resolves(null);

      await expect(service.register("hack-1", makeParticipantUser() as any)).rejects.toMatchObject(
        { httpCode: 422 },
      );
    });

    it("throws 409 when already registered", async () => {
      hackathonRepo.findOne.resolves(makeHackathon() as any);
      participantRepo.findOne.resolves(makeParticipant() as any);
      // Already registered check
      globalQb.getRawMany.resolves([{ count: "1" }]);

      await expect(service.register("hack-1", makeParticipantUser() as any)).rejects.toMatchObject(
        { httpCode: 409 },
      );
    });

    it("registers successfully when all checks pass", async () => {
      const hack = makeHackathon({ maxParticipants: null });
      hackathonRepo.findOne
        .onFirstCall()
        .resolves(hack as any)
        .onSecondCall()
        .resolves(hack as any);
      participantRepo.findOne.resolves(makeParticipant() as any);

      // First getRawMany: existing registration check -> 0
      // Second getRawMany: after insert, registration data for getOne
      globalQb.getRawMany.onFirstCall().resolves([{ count: "0" }]).onSecondCall().resolves([]);

      globalQb.execute.resolves({});

      const result = await service.register("hack-1", makeParticipantUser() as any);
      expect(result.id).toBe("hack-1");
    });
  });

  // ── unregister ────────────────────────────────────────────────────────────

  describe("unregister", () => {
    it("throws 403 for non-participant", async () => {
      await expect(service.unregister("hack-1", makeAdmin() as any)).rejects.toMatchObject({
        httpCode: 403,
      });
    });

    it("throws 422 when participant profile not found", async () => {
      participantRepo.findOne.resolves(null);

      await expect(
        service.unregister("hack-1", makeParticipantUser() as any),
      ).rejects.toMatchObject({ httpCode: 422 });
    });

    it("deletes registration successfully", async () => {
      participantRepo.findOne.resolves(makeParticipant() as any);
      globalQb.execute.resolves({});

      await expect(
        service.unregister("hack-1", makeParticipantUser() as any),
      ).resolves.toBeUndefined();
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("returns paginated hackathon list", async () => {
      const hack = makeHackathon();
      const repoQb = makeQueryBuilder();
      hackathonRepo.createQueryBuilder.returns(repoQb as any);
      repoQb.getManyAndCount.resolves([[hack], 1] as any);
      participantRepo.findOne.resolves(null);
      globalQb.getRawMany.resolves([]);

      const result = await service.list({ page: 1, limit: 12 }, null);
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it("filters by topic when provided", async () => {
      const repoQb = makeQueryBuilder();
      hackathonRepo.createQueryBuilder.returns(repoQb as any);
      repoQb.getManyAndCount.resolves([[], 0] as any);
      participantRepo.findOne.resolves(null);

      const result = await service.list({ topic: "AI" as any }, null);
      expect(result.total).toBe(0);
      expect(repoQb.andWhere.called).toBe(true);
    });
  });
});
