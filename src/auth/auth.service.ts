import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { envs } from '../config';
import { LoginUserDto, RegisterUserDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_ROUNDS = 10;
const DUMMY_HASH = `$2a$${BCRYPT_ROUNDS}$${'x'.repeat(53)}`;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterUserDto) {
    const user = await this.prisma.user
      .create({
        data: {
          email: dto.email.toLowerCase(),
          fullName: dto.fullName,
          passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
          role: 'user',
        },
      })
      .catch((error: unknown) => {
        if (this.isUniqueViolation(error)) {
          throw new RpcException({
            status: HttpStatus.CONFLICT,
            message: 'An account with that email already exists',
          });
        }
        throw error;
      });

    this.logger.log(`User registered: ${user.id}`);

    return this.buildSession(user);
  }

  async login(dto: LoginUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    const invalid = () =>
      new RpcException({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid credentials',
      });

    if (!user) {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      throw invalid();
    }

    if (!user.active) {
      throw new RpcException({
        status: HttpStatus.FORBIDDEN,
        message: 'This account is disabled',
      });
    }

    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw invalid();
    }

    return this.buildSession(user);
  }

  private async buildSession(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.issueRefreshToken(user.id),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  private async issueRefreshToken(userId: string) {
    const token = randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + envs.jwtRefreshExpiresInDays);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.hashToken(token), expiresAt },
    });

    return token;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === 'P2002'
    );
  }
}
