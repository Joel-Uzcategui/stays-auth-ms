import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AuthService } from './auth.service';
import {
  LoginUserDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterUserDto,
} from './dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.register')
  register(@Payload() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @MessagePattern('auth.login')
  login(@Payload() dto: LoginUserDto) {
    return this.authService.login(dto);
  }

  @MessagePattern('auth.refresh')
  refresh(@Payload() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @MessagePattern('auth.logout')
  logout(@Payload() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  @MessagePattern('auth.me')
  me(@Payload() userId: string) {
    return this.authService.me(userId);
  }
}
