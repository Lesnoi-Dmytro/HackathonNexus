jest.mock("../data-source", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    createQueryBuilder: jest.fn(),
    query: jest.fn(),
  },
}));

jest.mock("jsonwebtoken");

import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { authorizationChecker, currentUserChecker } from "../middleware/authChecker";
import { UserRole } from "../models/enums";
import { makeRepo } from "./helpers/mockRepo";

function makeAction(authorization?: string) {
  return {
    request: { headers: authorization ? { authorization } : {} },
  } as any;
}

describe("authorizationChecker", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("returns false when no Authorization header", async () => {
    const result = await authorizationChecker(makeAction(), []);
    expect(result).toBe(false);
  });

  it("returns false when token is invalid", async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error("invalid"); });

    const result = await authorizationChecker(makeAction("Bearer bad-token"), []);
    expect(result).toBe(false);
  });

  it("returns true when token is valid and no roles required", async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: "user-1",
      email: "a@b.com",
      role: UserRole.PARTICIPANT,
    });

    const result = await authorizationChecker(makeAction("Bearer good-token"), []);
    expect(result).toBe(true);
  });

  it("returns false when role HACKATHON_ADMIN required but user is PARTICIPANT", async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: "user-1",
      email: "a@b.com",
      role: UserRole.PARTICIPANT,
    });

    const result = await authorizationChecker(makeAction("Bearer token"), [UserRole.HACKATHON_ADMIN]);
    expect(result).toBe(false);
  });

  it("returns true when role HACKATHON_ADMIN required and user has that role", async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: "user-1",
      email: "a@b.com",
      role: UserRole.HACKATHON_ADMIN,
    });

    const result = await authorizationChecker(makeAction("Bearer token"), [UserRole.HACKATHON_ADMIN]);
    expect(result).toBe(true);
  });
});

describe("currentUserChecker", () => {
  let userRepo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    userRepo = makeRepo();
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(userRepo);
    process.env.JWT_SECRET = "test-secret";
  });

  it("returns null when no Authorization header", async () => {
    const result = await currentUserChecker(makeAction());
    expect(result).toBeNull();
  });

  it("returns null when token verification fails", async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error("bad token"); });

    const result = await currentUserChecker(makeAction("Bearer bad"));
    expect(result).toBeNull();
  });

  it("returns user when token is valid", async () => {
    const fakeUser = { id: "user-1", role: UserRole.PARTICIPANT };
    (jwt.verify as jest.Mock).mockReturnValue({ sub: "user-1", email: "a@b.com", role: UserRole.PARTICIPANT });
    userRepo.findOne.resolves(fakeUser as any);

    const result = await currentUserChecker(makeAction("Bearer valid-token"));
    expect(result).toEqual(fakeUser);
  });

  it("returns null when user not found in DB", async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ sub: "ghost", email: "g@g.com", role: UserRole.PARTICIPANT });
    userRepo.findOne.resolves(null);

    const result = await currentUserChecker(makeAction("Bearer token"));
    expect(result).toBeNull();
  });
});
