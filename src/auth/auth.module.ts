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
      privateKey: envs.jwtPrivateKey,
      publicKey: envs.jwtPublicKey,
      signOptions: {
        algorithm: 'RS256',
        expiresIn: envs.jwtAccessExpiresIn as SignOptions['expiresIn'],
      },
      verifyOptions: {
        algorithms: ['RS256'],
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
