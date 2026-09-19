import { IsString, IsUUID, Length } from 'class-validator';

export class LogoutDto {
  @IsUUID()
  userId: string;

  @IsString()
  @Length(64, 64)
  refreshToken: string;
}
