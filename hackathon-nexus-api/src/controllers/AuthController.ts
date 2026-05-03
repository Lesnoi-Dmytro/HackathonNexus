import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  Authorized,
  Body,
  CurrentUser,
  Get,
  HttpCode,
  HttpError,
  JsonController,
  Post,
} from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
import { AppDataSource } from "../data-source";
import { LoginDto, RegisterDto } from "../dtos/auth.dto";
import { AuthResponseDto, UserDto } from "../dtos/response.dto";
import { User } from "../entities/User";

function toUserDto(user: User): UserDto {
  const dto = new UserDto();
  dto.id = user.id;
  dto.firstName = user.firstName;
  dto.lastName = user.lastName;
  dto.email = user.email;
  dto.isAdmin = user.isAdmin;
  dto.createdAt = user.createdAt;
  dto.updatedAt = user.updatedAt;
  return dto;
}

@JsonController("/auth")
export class AuthController {
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
    const userRepo = AppDataSource.getRepository(User);

    const existing = await userRepo.findOneBy({ email: dto.email });
    if (existing) {
      throw new HttpError(409, "Email already in use");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
    });
    await userRepo.save(user);

    const response = new AuthResponseDto();
    response.accessToken = this.signToken(user);
    response.user = toUserDto(user);
    return response;
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
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.email = :email", { email: dto.email })
      .getOne();

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new HttpError(401, "Invalid credentials");
    }

    const response = new AuthResponseDto();
    response.accessToken = this.signToken(user);
    response.user = toUserDto(user);
    return response;
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

  private signToken(user: User): string {
    return jwt.sign(
      { sub: user.id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]) || "7d" },
    );
  }
}
