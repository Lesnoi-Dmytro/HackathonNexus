import {
  Authorized,
  Body,
  CurrentUser,
  Delete,
  Get,
  HttpCode,
  JsonController,
  Param,
  Patch,
  Post,
  QueryParams,
} from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
import {
  CreateHackathonDto,
  ListHackathonsQueryDto,
  UpdateHackathonDto,
} from "../dto/hackathon.dto";
import { HackathonDto, HackathonsPageDto } from "../dto/response.dto";
import { User } from "../entities/User";
import { UserRole } from "../models/enums";
import { HackathonService } from "../services/HackathonService";

@JsonController("/hackathons")
export class HackathonController {
  private readonly hackathonService = new HackathonService();

  @Get("/")
  @OpenAPI({
    summary: "List hackathons with optional filters and pagination",
    responses: {
      "200": {
        description: "Paginated list of hackathons",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/HackathonsPageDto" } },
        },
      },
    },
  })
  async list(
    @QueryParams() query: ListHackathonsQueryDto,
    @CurrentUser({ required: false }) user: User | null,
  ): Promise<HackathonsPageDto> {
    return this.hackathonService.list(query, user);
  }

  @Get("/:id")
  @OpenAPI({
    summary: "Get a single hackathon by ID",
    responses: {
      "200": {
        description: "Hackathon detail",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/HackathonDto" } },
        },
      },
      "404": { description: "Hackathon not found" },
    },
  })
  async getOne(
    @Param("id") id: string,
    @CurrentUser({ required: false }) user: User | null,
  ): Promise<HackathonDto> {
    return this.hackathonService.getOne(id, user);
  }

  @Post("/:id/register")
  @Authorized()
  @HttpCode(200)
  @OpenAPI({
    summary: "Register current participant for a hackathon",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": { description: "Registered — returns updated hackathon" },
      "401": { description: "Unauthorized" },
      "403": { description: "Not a participant" },
      "404": { description: "Hackathon not found" },
      "409": { description: "Already registered or registration full" },
    },
  })
  async register(
    @Param("id") id: string,
    @CurrentUser({ required: true }) user: User,
  ): Promise<HackathonDto> {
    return this.hackathonService.register(id, user);
  }

  @Delete("/:id/register")
  @Authorized()
  @HttpCode(204)
  @OpenAPI({
    summary: "Unregister current participant from a hackathon",
    security: [{ bearerAuth: [] }],
    responses: {
      "204": { description: "Unregistered" },
      "401": { description: "Unauthorized" },
      "403": { description: "Not a participant" },
    },
  })
  async unregister(
    @Param("id") id: string,
    @CurrentUser({ required: true }) user: User,
  ): Promise<void> {
    return this.hackathonService.unregister(id, user);
  }

  @Post("/")
  @Authorized(UserRole.HACKATHON_ADMIN)
  @HttpCode(201)
  @OpenAPI({
    summary: "Create a new hackathon (admin only)",
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/CreateHackathonDto" } },
      },
    },
    responses: {
      "201": {
        description: "Hackathon created",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/HackathonDto" } },
        },
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden — admin role required" },
    },
  })
  async create(
    @Body() dto: CreateHackathonDto,
    @CurrentUser({ required: true }) admin: User,
  ): Promise<HackathonDto> {
    return this.hackathonService.create(dto, admin);
  }

  @Patch("/:id")
  @Authorized(UserRole.HACKATHON_ADMIN)
  @OpenAPI({
    summary: "Update a hackathon (admin only, own hackathon)",
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/UpdateHackathonDto" } },
      },
    },
    responses: {
      "200": {
        description: "Hackathon updated",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/HackathonDto" } },
        },
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Hackathon not found" },
    },
  })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateHackathonDto,
    @CurrentUser({ required: true }) admin: User,
  ): Promise<HackathonDto> {
    return this.hackathonService.update(id, dto, admin);
  }
}
