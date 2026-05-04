import {
  Authorized,
  Body,
  CurrentUser,
  Get,
  HttpCode,
  JsonController,
  Param,
  Patch,
  Post,
  QueryParams,
} from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
import { CreateHackathonDto, ListHackathonsQueryDto, UpdateHackathonDto } from "../dto/hackathon.dto";
import { HackathonDto, HackathonsPageDto } from "../dto/response.dto";
import { User } from "../entities/User";
import { UserRole } from "../models/enums";
import { HackathonService } from "../services/HackathonService";

@JsonController("/hackathons")
export class HackathonController {
  private readonly hackathonService = new HackathonService();

  @Get("/")
  @Authorized()
  @OpenAPI({
    summary: "List hackathons with optional filters and pagination",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": {
        description: "Paginated list of hackathons",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/HackathonsPageDto" } },
        },
      },
      "401": { description: "Unauthorized" },
    },
  })
  async list(@QueryParams() query: ListHackathonsQueryDto): Promise<HackathonsPageDto> {
    return this.hackathonService.list(query);
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
