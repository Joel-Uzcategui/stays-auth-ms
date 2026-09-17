import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
