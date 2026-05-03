import {
  Authorized,
  Body,
  CurrentUser,
  HttpCode,
  JsonController,
  Param,
  Patch,
  Post,
} from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
import { CreateHackathonDto, UpdateHackathonDto } from "../dto/hackathon.dto";
import { HackathonDto } from "../dto/response.dto";
import { User } from "../entities/User";
import { UserRole } from "../models/enums";
import { HackathonService } from "../services/HackathonService";

@JsonController("/hackathons")
@Authorized(UserRole.HACKATHON_ADMIN)
export class HackathonController {
  private readonly hackathonService = new HackathonService();

  @Post("/")
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
