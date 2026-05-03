export class UserDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  isAdmin!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AuthResponseDto {
  accessToken!: string;
  user!: UserDto;
}
