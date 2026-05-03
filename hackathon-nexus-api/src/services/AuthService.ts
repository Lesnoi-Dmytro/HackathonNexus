import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { HttpError } from "routing-controllers";
import { AppDataSource } from "../data-source";
import { LoginDto, RegisterDto } from "../dto/auth.dto";
import { AuthResponseDto, ParticipantDto, UserDto } from "../dto/response.dto";
import { User } from "../entities/User";

export function toUserDto(user: User): UserDto {
  const dto = new UserDto();
  dto.id = user.id;
  dto.firstName = user.firstName;
  dto.lastName = user.lastName;
  dto.email = user.email;
  dto.role = user.role;
  dto.createdAt = user.createdAt;
  dto.updatedAt = user.updatedAt;
  if (user.participant) {
    const p = new ParticipantDto();
    p.id = user.participant.id;
    p.experience = user.participant.experience;
    p.yearsOfExperience = user.participant.yearsOfExperience;
    p.skills = user.participant.skills;
    p.position = user.participant.position;
    p.createdAt = user.participant.createdAt;
    p.updatedAt = user.participant.updatedAt;
    dto.participant = p;
  }
  return dto;
}

export class AuthService {
  private get userRepo() {
    return AppDataSource.getRepository(User);
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepo.findOneBy({ email: dto.email });
    if (existing) {
      throw new HttpError(409, "Email already in use");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
    });
    await this.userRepo.save(user);

    const response = new AuthResponseDto();
    response.accessToken = this.signToken(user);
    response.user = toUserDto(user);
    return response;
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepo
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

  private signToken(user: User): string {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]) || "7d",
    });
  }
}
