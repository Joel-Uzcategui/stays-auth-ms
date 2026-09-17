import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { envs } from '../config';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: envs.jwtSecret,
      signOptions: {
        expiresIn: envs.jwtAccessExpiresIn as SignOptions['expiresIn'],
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
