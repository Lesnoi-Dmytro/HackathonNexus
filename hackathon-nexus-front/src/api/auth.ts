import { request } from "./client";

export type UserRole = "hackathon-admin" | "participant";

export interface ParticipantDto {
  id: string;
  experience?: string;
  yearsOfExperience?: number;
  skills: string[];
  position?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  participant?: ParticipantDto;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", undefined, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", undefined, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe(token: string): Promise<UserDto> {
  return request<UserDto>("/auth/me", token);
}

export function getUserById(token: string, userId: string): Promise<UserDto> {
  return request<UserDto>(`/auth/users/${encodeURIComponent(userId)}`, token);
}

export interface UpdateParticipantPayload {
  skills?: string[];
  position?: string;
  experience?: string;
  yearsOfExperience?: number;
}

export function updateParticipantProfile(
  token: string,
  payload: UpdateParticipantPayload,
): Promise<UserDto> {
  return request<UserDto>("/auth/me/participant", token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
