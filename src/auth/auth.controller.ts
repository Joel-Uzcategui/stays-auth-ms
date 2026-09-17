import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AuthService } from './auth.service';
import { LoginUserDto, RegisterUserDto } from './dto';

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
}
