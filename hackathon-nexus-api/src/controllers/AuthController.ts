import {
  Authorized,
  Body,
  CurrentUser,
  Get,
  HttpCode,
  JsonController,
  Post,
} from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
import { LoginDto, RegisterDto } from "../dto/auth.dto";
import { AuthResponseDto, UserDto } from "../dto/response.dto";
import { User } from "../entities/User";
import { AuthService, toUserDto } from "../services/AuthService";

@JsonController("/auth")
export class AuthController {
  private readonly authService = new AuthService();

  @Post("/register")
  @HttpCode(201)
  @OpenAPI({
    summary: "Register a new user",
    requestBody: {
      required: true,
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/RegisterDto" } },
      },
    },
    responses: {
      "201": {
        description: "Successfully registered",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
        },
      },
      "409": { description: "Email already in use" },
    },
  })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post("/login")
  @OpenAPI({
    summary: "Login with email and password",
    requestBody: {
      required: true,
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/LoginDto" } },
      },
    },
    responses: {
      "200": {
        description: "Successfully logged in",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
        },
      },
      "401": { description: "Invalid credentials" },
    },
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get("/me")
  @Authorized()
  @OpenAPI({
    summary: "Get the currently authenticated user",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": {
        description: "Current user data",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/UserDto" } },
        },
      },
      "401": { description: "Unauthorized" },
    },
  })
  me(@CurrentUser({ required: true }) user: User): UserDto {
    return toUserDto(user);
  }
}
