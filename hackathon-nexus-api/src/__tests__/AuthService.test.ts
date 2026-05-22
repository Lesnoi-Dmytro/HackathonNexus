import sinon from "sinon";

// ── Mock data-source BEFORE importing the service ─────────────────────────
jest.mock("../data-source", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    createQueryBuilder: jest.fn(),
    query: jest.fn(),
  },
}));

jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { HttpError } from "routing-controllers";
import { AppDataSource } from "../data-source";
import { Skill, UserRole } from "../models/enums";
import { AuthService, toUserDto } from "../services/AuthService";
import { makeRepo } from "./helpers/mockRepo";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: "user-1",
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@test.com",
    password: "hashed",
    role: UserRole.PARTICIPANT,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    participant: null,
    ...overrides,
  };
}

function makeParticipant(overrides: Record<string, any> = {}) {
  return {
    id: "participant-1",
    skills: ["TypeScript"],
    position: "Backend",
    experience: "2 years",
    yearsOfExperience: 2,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("toUserDto", () => {
  it("maps a user without participant", () => {
    const user = makeUser({ participant: null });
    const dto = toUserDto(user as any);
    expect(dto.id).toBe("user-1");
    expect(dto.email).toBe("alice@test.com");
    expect(dto.participant).toBeUndefined();
  });

  it("maps a user with participant", () => {
    const participant = makeParticipant();
    const user = makeUser({ participant });
    const dto = toUserDto(user as any);
    expect(dto.participant).toBeDefined();
    expect(dto.participant!.id).toBe("participant-1");
    expect(dto.participant!.skills).toEqual(["TypeScript"]);
  });
});

describe("AuthService", () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof makeRepo>;
  let participantRepo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    userRepo = makeRepo();
    participantRepo = makeRepo();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity?.name === "User" || entity === require("../entities/User").User) return userRepo;
      return participantRepo;
    });

    service = new AuthService();
    jest.clearAllMocks();

    // Re-apply repo mock after clearAllMocks
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity?.name === "User" || entity === require("../entities/User").User) return userRepo;
      return participantRepo;
    });

    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => sinon.restore());

  // ── register ──────────────────────────────────────────────────────────────

  describe("register", () => {
    it("creates a new PARTICIPANT user and returns token", async () => {
      userRepo.findOneBy.resolves(null);
      userRepo.create.returns(makeUser() as any);
      userRepo.save.resolves(makeUser() as any);
      participantRepo.create.returns(makeParticipant() as any);
      participantRepo.save.resolves(makeParticipant() as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      (jwt.sign as jest.Mock).mockReturnValue("token-123");

      const result = await service.register({
        firstName: "Alice",
        lastName: "Smith",
        email: "alice@test.com",
        password: "pass123",
        role: UserRole.PARTICIPANT,
      });

      expect(result.accessToken).toBe("token-123");
      expect(result.user.email).toBe("alice@test.com");
    });

    it("creates a HACKATHON_ADMIN user without participant profile", async () => {
      const adminUser = makeUser({ role: UserRole.HACKATHON_ADMIN, participant: null });
      userRepo.findOneBy.resolves(null);
      userRepo.create.returns(adminUser as any);
      userRepo.save.resolves(adminUser as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      (jwt.sign as jest.Mock).mockReturnValue("token-admin");

      const result = await service.register({
        firstName: "Bob",
        lastName: "Admin",
        email: "bob@test.com",
        password: "admin123",
        role: UserRole.HACKATHON_ADMIN,
      });

      expect(result.accessToken).toBe("token-admin");
      expect(participantRepo.create.called).toBe(false);
    });

    it("throws 409 when email is already in use", async () => {
      userRepo.findOneBy.resolves(makeUser() as any);

      await expect(
        service.register({
          firstName: "Alice",
          lastName: "Smith",
          email: "alice@test.com",
          password: "pass123",
          role: UserRole.PARTICIPANT,
        }),
      ).rejects.toThrow(HttpError);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("returns token on valid credentials", async () => {
      const qb = userRepo._qb;
      qb.getOne.resolves(makeUser() as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue("access-token");

      const result = await service.login({ email: "alice@test.com", password: "pass123" });
      expect(result.accessToken).toBe("access-token");
    });

    it("throws 401 when user is not found", async () => {
      const qb = userRepo._qb;
      qb.getOne.resolves(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ email: "x@x.com", password: "wrong" })).rejects.toThrow();
    });

    it("throws 401 when password does not match", async () => {
      const qb = userRepo._qb;
      qb.getOne.resolves(makeUser() as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ email: "alice@test.com", password: "wrong" })).rejects.toThrow();
    });
  });

  // ── getUserById ───────────────────────────────────────────────────────────

  describe("getUserById", () => {
    it("returns UserDto when user exists", async () => {
      userRepo.findOne.resolves(makeUser() as any);

      const result = await service.getUserById("user-1");
      expect(result.id).toBe("user-1");
    });

    it("throws 404 when user is not found", async () => {
      userRepo.findOne.resolves(null);

      await expect(service.getUserById("missing")).rejects.toThrow(HttpError);
    });
  });

  // ── updateParticipant ─────────────────────────────────────────────────────

  describe("updateParticipant", () => {
    it("updates and returns UserDto", async () => {
      const participant = makeParticipant();
      participantRepo.findOne.resolves(participant as any);
      participantRepo.save.resolves(participant as any);
      const user = makeUser({ participant });
      userRepo.findOne.resolves(user as any);

      const result = await service.updateParticipant("user-1", {
        skills: [Skill.GO],
        yearsOfExperience: 3,
      });

      expect(result.id).toBe("user-1");
      expect(participantRepo.save.calledOnce).toBe(true);
    });

    it("throws 404 when participant profile is not found", async () => {
      participantRepo.findOne.resolves(null);

      await expect(service.updateParticipant("user-1", {})).rejects.toThrow(HttpError);
    });
  });
});
