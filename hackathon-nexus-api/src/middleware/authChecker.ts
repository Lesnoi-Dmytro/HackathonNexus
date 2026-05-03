import jwt from "jsonwebtoken";
import { Action } from "routing-controllers";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { UserRole } from "../models/enums";

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

function extractToken(action: Action): string | null {
  const header: string | undefined = action.request.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function authorizationChecker(action: Action, roles: string[]): Promise<boolean> {
  const token = extractToken(action);
  if (!token) return false;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    if (
      roles.length > 0 &&
      roles.includes(UserRole.HACKATHON_ADMIN) &&
      payload.role !== UserRole.HACKATHON_ADMIN
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function currentUserChecker(action: Action): Promise<User | null> {
  const token = extractToken(action);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    return await AppDataSource.getRepository(User).findOneBy({ id: payload.sub });
  } catch {
    return null;
  }
}
