import {
  Authorized,
  BadRequestError,
  Body,
  CurrentUser,
  ForbiddenError,
  Get,
  JsonController,
  NotFoundError,
  Param,
  Post,
  QueryParam,
} from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
import { User } from "../entities/User";
import { ChatRoomDto, ChatService, MessageDto } from "../services/ChatService";

@JsonController("/chat")
@Authorized()
export class ChatController {
  private readonly chatService = new ChatService();

  // ── Rooms ─────────────────────────────────────────────────────────────────

  @Get("/rooms")
  @OpenAPI({
    summary: "List all chat rooms the current user participates in",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": { description: "Array of chat rooms" },
      "401": { description: "Unauthorized" },
    },
  })
  async getRooms(@CurrentUser({ required: true }) user: User): Promise<ChatRoomDto[]> {
    return this.chatService.getUserRooms(user.id);
  }

  @Post("/rooms/team/:teamId")
  @OpenAPI({
    summary: "Open (or get existing) team chat room",
    description: "Creates a shared room for the whole team on first call; idempotent afterwards.",
    security: [{ bearerAuth: [] }],
    parameters: [
      { in: "path", name: "teamId", required: true, schema: { type: "string", format: "uuid" } },
    ],
    responses: {
      "200": { description: "Chat room" },
      "401": { description: "Unauthorized" },
      "403": { description: "Not a team member" },
      "404": { description: "Team not found" },
    },
  })
  async getOrCreateTeamRoom(
    @Param("teamId") teamId: string,
    @CurrentUser({ required: true }) user: User,
  ): Promise<ChatRoomDto> {
    try {
      return await this.chatService.getOrCreateTeamRoom(teamId, user.id);
    } catch (err: any) {
      if (err.status === 404) throw new NotFoundError(err.message);
      if (err.status === 403) throw new ForbiddenError(err.message);
      throw err;
    }
  }

  @Post("/rooms/direct")
  @OpenAPI({
    summary: "Open (or get existing) direct message room with another user",
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["targetUserId"],
            properties: { targetUserId: { type: "string", format: "uuid" } },
          },
        },
      },
    },
    responses: {
      "200": { description: "Chat room" },
      "400": { description: "Cannot DM yourself" },
      "401": { description: "Unauthorized" },
      "404": { description: "Target user not found" },
    },
  })
  async getOrCreateDirectRoom(
    @Body() body: { targetUserId: string },
    @CurrentUser({ required: true }) user: User,
  ): Promise<ChatRoomDto> {
    try {
      return await this.chatService.getOrCreateDirectRoom(user.id, body.targetUserId);
    } catch (err: any) {
      if (err.status === 400) throw new BadRequestError(err.message);
      if (err.status === 404) throw new NotFoundError(err.message);
      throw err;
    }
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  @Get("/rooms/:roomId/messages")
  @OpenAPI({
    summary: "Get paginated message history for a chat room",
    description:
      "Returns up to `limit` messages, newest-first. " +
      "Pass `before` (ISO timestamp) to load earlier pages.",
    security: [{ bearerAuth: [] }],
    parameters: [
      { in: "path", name: "roomId", required: true, schema: { type: "string", format: "uuid" } },
      {
        in: "query",
        name: "before",
        required: false,
        schema: { type: "string", format: "date-time" },
        description: "Cursor: return messages older than this ISO timestamp",
      },
      {
        in: "query",
        name: "limit",
        required: false,
        schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
      },
    ],
    responses: {
      "200": { description: "Array of messages, newest-first" },
      "401": { description: "Unauthorized" },
      "403": { description: "Not a member of this room" },
    },
  })
  async getMessages(
    @Param("roomId") roomId: string,
    @CurrentUser({ required: true }) user: User,
    @QueryParam("before") before?: string,
    @QueryParam("limit") limit = 50,
  ): Promise<MessageDto[]> {
    const isMember = await this.chatService.isRoomMember(roomId, user.id);
    if (!isMember) throw new ForbiddenError("You are not a member of this room");
    return this.chatService.getMessages(roomId, before, limit);
  }
}
