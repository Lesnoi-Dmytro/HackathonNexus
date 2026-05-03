import axios from "axios";
import { Position, Skill } from "../models/enums";

export interface RecommendMemberPayload {
  skills: Skill[];
  position?: Position;
}

interface RecommendRequest {
  topic: string;
  max_team_size: number;
  members: RecommendMemberPayload[];
  top_k_skills?: number;
  top_k_positions?: number;
}

export interface ScoredSkill {
  skill: string;
  score: number;
}

export interface ScoredPosition {
  position: string;
  score: number;
}

export interface RecommendResponse {
  recommended_skills: ScoredSkill[];
  recommended_positions: ScoredPosition[];
}

export async function fetchRecommendations(
  topic: string,
  maxTeamSize: number,
  members: RecommendMemberPayload[],
  topKSkills?: number,
  topKPositions?: number,
): Promise<RecommendResponse> {
  const baseUrl = process.env.RECOMMEND_API_URL;
  const token = process.env.RECOMMEND_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error("Recommendation API is not configured");
  }

  const payload: RecommendRequest = {
    topic,
    max_team_size: maxTeamSize,
    members,
    ...(topKSkills !== undefined && { top_k_skills: topKSkills }),
    ...(topKPositions !== undefined && { top_k_positions: topKPositions }),
  };

  const response = await axios.post<RecommendResponse>(`${baseUrl}/recommend`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
}
