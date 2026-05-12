import {
  Authorized,
  Body,
  CurrentUser,
  Delete,
  Get,
  HttpCode,
  JsonController,
  Param,
  Post,
  QueryParam,
  QueryParams,
} from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
import {
  MembersRecommendResponseDto,
  TeamDto,
  TeamRequestItemDto,
  TeamsRecommendResponseDto,
} from "../dto/response.dto";
import { CreateTeamDto, FindMembersQueryDto, FindTeamsQueryDto } from "../dto/team.dto";
import { User } from "../entities/User";
import { UserRole } from "../models/enums";
import { TeamService } from "../services/TeamService";

@JsonController("/teams")
@Authorized(UserRole.PARTICIPANT)
export class TeamController {
  private readonly teamService = new TeamService();

  @Post("/")
  @HttpCode(201)
  @OpenAPI({
    summary: "Form a team for a hackathon (participant only)",
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/CreateTeamDto" } },
      },
    },
    responses: {
      "201": {
        description: "Team created",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/TeamDto" } },
        },
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden — participant role required" },
      "404": { description: "Hackathon not found" },
      "409": { description: "Already in a team for this hackathon" },
      "422": { description: "Participant profile not found" },
    },
  })
  async create(
    @Body() dto: CreateTeamDto,
    @CurrentUser({ required: true }) user: User,
  ): Promise<TeamDto> {
    return this.teamService.create(dto, user);
  }

  @Post("/:id/join")
  @OpenAPI({
    summary: "Join an existing team (participant only)",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": {
        description: "Joined team",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/TeamDto" } },
        },
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden — participant role required" },
      "404": { description: "Team not found" },
      "409": { description: "Team full or already in a team" },
      "422": { description: "Participant profile not found" },
    },
  })
  async join(
    @Param("id") id: string,
    @CurrentUser({ required: true }) user: User,
  ): Promise<TeamDto> {
    return this.teamService.join(id, user);
  }

  @Get("/my")
  @OpenAPI({
    summary: "Get the current participant's team for a hackathon (null if none)",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": { description: "Team or null" },
    },
  })
  async getMyTeam(
    @QueryParam("hackathonId", { required: true }) hackathonId: string,
    @CurrentUser({ required: true }) user: User,
  ): Promise<TeamDto | null> {
    return this.teamService.getMyTeam(hackathonId, user);
  }

  @Get("/invites")
  @OpenAPI({
    summary: "Get pending team invitations for the current participant",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": { description: "List of pending invites" },
    },
  })
  async getMyInvites(
    @CurrentUser({ required: true }) user: User,
  ): Promise<TeamRequestItemDto[]> {
    return this.teamService.getMyInvites(user);
  }

  @Get("/recommend")
  @OpenAPI({
    summary: "Find teams for a participant (with AI recommendations)",
    description:
      "Returns open teams in a hackathon that match the provided skill/position filters. " +
      "If no filters are given, calls the recommendation API using the participant's own profile " +
      "to derive what to look for, and includes the recommendations in the response.",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": {
        description: "Matching teams with optional AI recommendations",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TeamsRecommendResponseDto" },
          },
        },
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden — participant role required" },
      "404": { description: "Hackathon not found" },
      "422": { description: "Participant profile not found" },
    },
  })
  async findTeams(
    @QueryParams() query: FindTeamsQueryDto,
    @CurrentUser({ required: true }) user: User,
  ): Promise<TeamsRecommendResponseDto> {
    return this.teamService.findTeams(query, user);
  }

  @Get("/:id/requests")
  @OpenAPI({
    summary: "Get pending join requests for a team (leader only)",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": { description: "List of pending join requests" },
      "403": { description: "Forbidden — only the team leader can view" },
      "404": { description: "Team not found" },
    },
  })
  async getTeamRequests(
    @Param("id") id: string,
    @CurrentUser({ required: true }) user: User,
  ): Promise<TeamRequestItemDto[]> {
    return this.teamService.getTeamRequests(id, user);
  }

  @Get("/:id/recommend-members")
  @OpenAPI({
    summary: "Find available participants for a team (with AI recommendations)",
    description:
      "Returns participants not yet in any team for the same hackathon that match the provided " +
      "skill/position filters. If no filters are given, calls the recommendation API using the " +
      "team's current composition to derive what to look for.",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": {
        description: "Matching participants with optional AI recommendations",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/MembersRecommendResponseDto" },
          },
        },
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden — participant role required" },
      "404": { description: "Team not found" },
    },
  })
  async findMembers(
    @Param("id") id: string,
    @QueryParams() query: FindMembersQueryDto,
  ): Promise<MembersRecommendResponseDto> {
    return this.teamService.findMembers(id, query);
  }

  @Delete("/:id/members/:participantId")
  @HttpCode(200)
  @OpenAPI({
    summary: "Kick a member from a team (leader only)",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": {
        description: "Updated team",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/TeamDto" } },
        },
      },
      "400": { description: "Cannot kick the leader" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden — only the team leader can kick" },
      "404": { description: "Team or member not found" },
    },
  })
  async kickMember(
    @Param("id") id: string,
    @Param("participantId") participantId: string,
    @CurrentUser({ required: true }) user: User,
  ): Promise<TeamDto> {
    return this.teamService.kickMember(id, participantId, user);
  }

  @Delete("/:id")
  @HttpCode(204)
  @OpenAPI({
    summary: "Delete a team (leader only)",
    security: [{ bearerAuth: [] }],
    responses: {
      "204": { description: "Team deleted" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden — only the team leader can delete" },
      "404": { description: "Team not found" },
    },
  })
  async deleteTeam(
    @Param("id") id: string,
    @CurrentUser({ required: true }) user: User,
  ): Promise<void> {
    return this.teamService.delete(id, user);
  }
}
